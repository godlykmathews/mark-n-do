# Mark'n'Do

Mark'n'Do is a real-time, collaborative todo application built with Next.js and Firebase. It allows users to seamlessly create, manage, and collaborate on tasks together.

## Features

- **Real-time Collaboration:** See task updates instantly as other users add, edit, or complete them.
- **Authentication:** Secure user login and management powered by Firebase Auth.
- **Task Management:** Create, organize, and toggle your todos efficiently.
- **Live Updates:** Powered by Firebase Firestore real-time listeners.

## Technologies Used

- [Next.js](https://nextjs.org) (App Router)
- [Firebase](https://firebase.google.com) (Authentication & Firestore)
- React
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
2. Enable Authentication and Firestore.
3. Copy your project configuration and add it to your local environment variables (e.g., `.env.local`).

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deploy

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new). Make sure to add your Firebase configuration to the environment variables in your deployment dashboard.
