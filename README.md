# Mark'n'Do

Mark'n'Do is a real-time, collaborative todo application built with Next.js and Firebase. It allows users to seamlessly create, manage, and collaborate on tasks together.

## Features

- **Real-time Collaboration:** See task updates instantly as other users add, edit, or complete them.
- **Authentication:** Secure user login and management powered by Firebase Auth.
- **Task Management:** Create, organize, and toggle your todos efficiently.
- **Live Updates:** Powered by Firebase Firestore real-time listeners.
- **AI Roadmap Generation:** ✨ Generate structured learning or project roadmaps using AI. Specify a goal and duration, and the app creates a weekly breakdown with daily checkpoints—all fully editable like normal tasks.

## Technologies Used

- [Next.js](https://nextjs.org) (App Router)
- [Firebase](https://firebase.google.com) (Authentication & Firestore)
- [Google Gemini API](https://ai.google.dev) (AI Roadmap Generation)
- React
- Material-UI
- Tailwind CSS

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, set up your Firebase project:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Authentication (Google) and Firestore.
3. Copy your project configuration and add it to your local environment variables (e.g., `.env.local`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### AI Roadmap Feature (Optional)

To enable AI-powered roadmap generation, you'll need a Google Gemini API key:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add it to your `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If the `GEMINI_API_KEY` is not configured, the app still works normally—only the AI Roadmap feature will be unavailable.

### Using AI Roadmaps

1. Click the **+ button** in the app
2. Select **AI Roadmap**
3. Enter your goal (e.g., "Learn Web Development")
4. Select duration (1 week to 1 year)
5. Choose intensity level (Light, Medium, Intensive)
6. The AI generates a structured plan with weekly breakdowns and daily checkpoints
7. All generated items are fully editable, shareable, and behave like normal tasks

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deploy

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new). Make sure to add your Firebase configuration **and** `GEMINI_API_KEY` (if using AI features) to the environment variables in your deployment dashboard.

### Firestore Setup

If deploying for the first time, ensure your Firestore has the proper security rules. The app uses a single `items` collection with access control via `allowedEmails` arrays. See `firestore.rules` for the default configuration.
