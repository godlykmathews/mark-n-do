/**
 * Roadmap schema: defines the contract for AI-generated roadmap responses
 * and normalization rules for converting roadmap data into Firestore items.
 */

export interface RoadmapCheckpoint {
  dayNumber: number; // 1-based day within week
  title: string;
  description?: string;
  order?: number; // Sort order within day
}

export interface RoadmapWeek {
  weekNumber: number; // 1-based week number
  title: string;
  description?: string;
  checkpoints: RoadmapCheckpoint[];
  order?: number; // Sort order within roadmap
}

export interface RoadmapData {
  goal: string;
  duration: string; // e.g., "4 weeks", "1 month"
  durationWeeks: number; // Numeric week count (e.g., 4)
  weeks: RoadmapWeek[];
  metadata?: {
    createdAt?: string;
    intensity?: 'light' | 'medium' | 'intensive';
  };
}

/**
 * Validate roadmap data against schema constraints.
 * Throws error if data is invalid.
 */
export function validateRoadmap(data: unknown): RoadmapData {
  const roadmap = data as RoadmapData;

  if (!roadmap.goal || typeof roadmap.goal !== 'string' || roadmap.goal.trim().length === 0) {
    throw new Error('Roadmap must have a non-empty goal.');
  }

  if (!roadmap.duration || typeof roadmap.duration !== 'string') {
    throw new Error('Roadmap must have a duration.');
  }

  if (!roadmap.durationWeeks || typeof roadmap.durationWeeks !== 'number' || roadmap.durationWeeks < 1) {
    throw new Error('Roadmap durationWeeks must be at least 1.');
  }

  if (!Array.isArray(roadmap.weeks) || roadmap.weeks.length === 0) {
    throw new Error('Roadmap must have at least one week.');
  }

  // Enforce max weeks and checkpoints per week
  if (roadmap.weeks.length > 52) {
    throw new Error('Roadmap can have at most 52 weeks.');
  }

  roadmap.weeks.forEach((week, weekIdx) => {
    if (!week.title || typeof week.title !== 'string') {
      throw new Error(`Week ${weekIdx + 1} must have a title.`);
    }

    if (!Array.isArray(week.checkpoints)) {
      throw new Error(`Week ${weekIdx + 1} must have checkpoints array.`);
    }

    if (week.checkpoints.length === 0) {
      throw new Error(`Week ${weekIdx + 1} must have at least one checkpoint.`);
    }

    if (week.checkpoints.length > 30) {
      throw new Error(`Week ${weekIdx + 1} can have at most 30 checkpoints.`);
    }

    week.checkpoints.forEach((checkpoint, cpIdx) => {
      if (!checkpoint.title || typeof checkpoint.title !== 'string') {
        throw new Error(`Week ${weekIdx + 1} checkpoint ${cpIdx + 1} must have a title.`);
      }
    });
  });

  return roadmap;
}

/**
 * Normalize roadmap data: ensure weekNumber and order fields are set.
 */
export function normalizeRoadmap(roadmap: RoadmapData): RoadmapData {
  return {
    ...roadmap,
    weeks: roadmap.weeks.map((week, weekIdx) => ({
      ...week,
      weekNumber: week.weekNumber || weekIdx + 1,
      order: week.order ?? weekIdx,
      checkpoints: week.checkpoints.map((checkpoint, cpIdx) => ({
        ...checkpoint,
        dayNumber: checkpoint.dayNumber || cpIdx + 1,
        order: checkpoint.order ?? cpIdx,
      })),
    })),
  };
}
