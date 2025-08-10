# GEMINI.md

This file provides a comprehensive overview of the EstimatePro 2.5 project, its architecture, and development practices. It is intended to be used as a guide for developers and contributors.

## Project Overview

EstimatePro 2.5 is a web-based application for creating and managing construction estimates. It is built with Next.js, a React framework for building server-rendered and statically-generated web applications. The application uses Supabase for its backend, including database, authentication, and storage.

The frontend is built with React and TypeScript, and it uses a variety of libraries for UI components, state management, and other features. The application is designed to be modular and extensible, with a clear separation of concerns between the frontend, backend, and API layers.

### Key Technologies

- **Framework:** Next.js
- **Language:** TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **UI:** React, Radix UI, Tailwind CSS
- **State Management:** Zustand, React Query
- **Forms:** React Hook Form, Zod
- **API:** Next.js API Routes, REST
- **Testing:** Jest, React Testing Library
- **Linting:** ESLint
- **Formatting:** Prettier
- **Deployment:** Vercel

## Building and Running

The following commands are used to build, run, and test the project:

- **Development:** `npm run dev` - Starts the development server on `http://localhost:3000`.
- **Building:** `npm run build` - Creates a production build of the application.
- **Starting:** `npm run start` - Starts the production server.
- **Testing:** `npm run test` - Runs the test suite.
- **Linting:** `npm run lint` - Lints the codebase for errors and style issues.
- **Type Checking:** `npm run typecheck` - Checks the codebase for TypeScript errors.

## Development Conventions

The project follows a set of development conventions to ensure code quality, consistency, and maintainability.

- **Coding Style:** The project uses Prettier for code formatting and ESLint for linting. The configuration files for these tools can be found in the root directory.
- **Testing:** The project uses Jest and React Testing Library for testing. All new features and bug fixes should be accompanied by tests.
- **Commits:** The project follows the Conventional Commits specification for commit messages.
- **Branching:** The project uses the GitFlow branching model. All new development should be done on a feature branch.
- **Pull Requests:** All pull requests must be reviewed and approved by at least one other developer before being merged.

## Key Files

The following is a list of key files and directories in the project:

- **`app/`:** The main application directory, containing the Next.js pages and API routes.
- **`components/`:** The directory for reusable React components.
- **`lib/`:** The directory for shared libraries and utilities, including the Supabase client.
- **`public/`:** The directory for static assets, such as images and fonts.
- **`scripts/`:** The directory for build scripts and other automation tasks.
- **`styles/`:** The directory for global CSS styles.
- **`supabase/`:** The directory for Supabase-related files, such as database migrations.
- **`types/`:** The directory for TypeScript type definitions.
- **`next.config.mjs`:** The configuration file for Next.js.
- **`package.json`:** The project's metadata and dependencies.
- **`tsconfig.json`:** The configuration file for TypeScript.
