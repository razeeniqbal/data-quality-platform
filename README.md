# Data Quality Platform

A data quality checking platform built with React, TypeScript, and Supabase. Hosted entirely on Vercel.

## Features

- **Project Management**: Create and manage data quality projects
- **Quality Dimensions**: Configure quality dimensions (Completeness, Consistency, Validity, Uniqueness)
- **Template System**: Save and reuse quality check configurations
- **CSV Upload**: Upload datasets and configure quality checks
- **Results Analysis**: Quality check results with scores and metrics

## Technology Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Supabase (PostgreSQL database)
- Vercel (hosting)

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account

### Local Development

```bash
git clone <your-repo-url>
cd data-quality-platform
npm install
npm run dev
```

App runs at: http://localhost:5173

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these from your Supabase dashboard: **Settings > API**.

## Project Structure

```
data-quality-platform/
├── src/
│   ├── components/        # React components
│   ├── lib/               # Supabase client & utilities
│   ├── pages/             # Page components
│   └── types/             # TypeScript types
├── public/                # Static assets
├── vercel.json            # Vercel deployment config
└── package.json
```

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Deploy

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm test             # Run tests
```

## License

Copyright AEM ENERGY SOLUTION. All rights reserved.
