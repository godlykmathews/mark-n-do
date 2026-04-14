/**
 * POST /api/roadmap/generate
 * 
 * Secure server-side endpoint for AI roadmap generation.
 * - Validates input constraints
 * - Calls Google Gemini API with server-side key
 * - Validates and normalizes response
 * - Returns structured roadmap JSON with safeguards
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRoadmap, normalizeRoadmap, RoadmapData } from '@/lib/roadmapSchema';

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Rate limiting: simple in-memory tracking (production: use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_HOUR = 10;
const HOUR_IN_MS = 60 * 60 * 1000;

interface RoadmapGenerationRequest {
  goal: string; // e.g., "Learn Web Development"
  duration: string; // e.g., "1 month", "4 weeks"
  durationWeeks: number; // e.g., 4
  intensity?: 'light' | 'medium' | 'intensive'; // Optional intensity hint
}

interface RoadmapGenerationResponse {
  success: boolean;
  roadmap?: RoadmapData;
  error?: string;
}

/**
 * Check rate limit for a given identifier (IP or user).
 */
function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const userData = requestCounts.get(identifier);

  if (!userData) {
    requestCounts.set(identifier, { count: 1, resetTime: now + HOUR_IN_MS });
    return { allowed: true };
  }

  if (now > userData.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + HOUR_IN_MS });
    return { allowed: true };
  }

  userData.count += 1;
  if (userData.count > MAX_REQUESTS_PER_HOUR) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded: ${MAX_REQUESTS_PER_HOUR} requests per hour allowed.` 
    };
  }

  return { allowed: true };
}

/**
 * Build a prompt for Gemini to generate a structured roadmap.
 */
function buildRoadmapPrompt(req: RoadmapGenerationRequest): string {
  const intensityGuide =
    req.intensity === 'light'
      ? 'Keep the workload light—short daily tasks, 30-45 min/day.'
      : req.intensity === 'intensive'
        ? 'Make it challenging—longer daily tasks, 2-3 hours/day.'
        : 'Moderate workload—1-2 hours/day.';

  return `You are a learning roadmap planner. Generate a structured ${req.durationWeeks}-week roadmap for the following goal:

Goal: ${req.goal}
Duration: ${req.duration}
Intensity: ${intensityGuide}

Return a valid JSON object with EXACTLY this structure (no markdown, no extra text):
{
  "goal": "string",
  "duration": "string (e.g., '4 weeks')",
  "durationWeeks": number,
  "weeks": [
    {
      "weekNumber": number (1-based),
      "title": "string (e.g., 'Week 1: HTML Basics')",
      "description": "string (optional brief overview)",
      "checkpoints": [
        {
          "dayNumber": number (1-based),
          "title": "string (checkpoint task, e.g., 'Understand HTML structure')",
          "description": "string (optional)"
        }
      ]
    }
  ],
  "metadata": {
    "intensity": "light|medium|intensive"
  }
}

Requirements:
- Generate exactly ${req.durationWeeks} weeks
- Each week should have 5-7 daily checkpoints
- Checkpoints should be concrete, actionable tasks
- Return ONLY the JSON object, no other text
- Ensure all required fields are present
- JSON must be valid and parseable`;
}

/**
 * Parse and extract JSON from Gemini response (handles potential markdown wrapping).
 */
function parseGeminiResponse(responseText: string): RoadmapData {
  // Try direct parse first
  try {
    return JSON.parse(responseText);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try extracting JSON object directly
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('Could not extract JSON from Gemini response.');
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<RoadmapGenerationResponse>> {
  try {
    // Rate limiting using client IP or fallback identifier
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = checkRateLimit(clientIp);
    
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitCheck.message || 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    // Validate API key
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const req: RoadmapGenerationRequest = body;

    // Validate input constraints
    if (!req.goal || typeof req.goal !== 'string' || req.goal.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    if (req.goal.trim().length > 500) {
      return NextResponse.json(
        { success: false, error: 'Goal must be 500 characters or less.' },
        { status: 400 }
      );
    }

    if (!req.durationWeeks || typeof req.durationWeeks !== 'number' || req.durationWeeks < 1 || req.durationWeeks > 52) {
      return NextResponse.json(
        { success: false, error: 'Duration weeks must be between 1 and 52.' },
        { status: 400 }
      );
    }

    if (!req.duration || typeof req.duration !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Duration string is required.' },
        { status: 400 }
      );
    }

    // Build prompt for Gemini
    const prompt = buildRoadmapPrompt(req);

    // Call Gemini API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_UNSPECIFIED',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Record<string, unknown>).name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Roadmap generation timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorBody);
      
      if (geminiResponse.status === 429) {
        return NextResponse.json(
          { success: false, error: 'AI service is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `AI service error: ${geminiResponse.status}. Please try again.` },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json() as Record<string, unknown>;

    // Extract text from Gemini response
    if (!geminiData.candidates || !(Array.isArray(geminiData.candidates) && geminiData.candidates.length > 0)) {
      return NextResponse.json(
        { success: false, error: 'AI returned no response. Please try again.' },
        { status: 502 }
      );
    }

    const candidates = geminiData.candidates as Record<string, unknown>[];
    const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
    const content = firstCandidate?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Record<string, unknown>[] | undefined;
    const generatedText = parts?.[0]?.text as string | undefined;
    if (!generatedText) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty content. Please try again.' },
        { status: 502 }
      );
    }

    // Parse and validate roadmap
    let roadmapData: RoadmapData;
    try {
      roadmapData = parseGeminiResponse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response. The roadmap format was invalid. Please try again.' },
        { status: 502 }
      );
    }

    // Validate against schema
    try {
      roadmapData = validateRoadmap(roadmapData);
    } catch (validationError) {
      console.error('Roadmap validation failed:', validationError);
      return NextResponse.json(
        { success: false, error: `Generated roadmap failed validation: ${(validationError as Error).message}. Please try again.` },
        { status: 502 }
      );
    }

    // Normalize roadmap
    roadmapData = normalizeRoadmap(roadmapData);

    return NextResponse.json({
      success: true,
      roadmap: roadmapData,
    });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during roadmap generation.' },
      { status: 500 }
    );
  }
}
