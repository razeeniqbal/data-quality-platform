# Data Quality Platform

A comprehensive data quality checking platform with Microsoft authentication, built with React, TypeScript, Vite, and Supabase.

## Features

- **User Authentication**: Microsoft OAuth + Email/Password authentication via Supabase Auth
- **Project Management**: Create and manage data quality projects with role-based access (Owner/Editor/Viewer)
- **Collaborative Sharing**: Share projects with team members
- **Quality Dimensions**: Configure multiple quality dimensions (Completeness, Consistency, Validity, Uniqueness, Accuracy, Timeliness)
- **Template System**: Save and reuse quality check configurations
- **CSV Upload**: Upload datasets and configure quality checks
- **Results Analysis**: Detailed quality check results with metrics and visualization

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Microsoft OAuth + Email/Password)
- **Icons**: Lucide React

## Project Structure

```
data-quality-platform/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # Auth context
│   ├── lib/               # Supabase client
│   ├── pages/             # Page components
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # Database migration files
├── public/               # Static assets
└── package.json         # Dependencies
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173
```

### 3. Set Up Database

Run the migration files in order in your Supabase SQL Editor:

1. `supabase/migrations/20251216133236_create_data_quality_tables.sql`
2. `supabase/migrations/20251216142924_fix_rls_policies_for_public_access.sql`
3. `supabase/migrations/20251217004706_create_quality_dimension_config.sql`
4. `supabase/migrations/20251217024610_add_dimension_configuration_rules.sql`
5. `supabase/migrations/20251217025424_add_reference_data_storage.sql`
6. `supabase/migrations/20251217064839_add_unique_constraint_config_id.sql`
7. `supabase/migrations/20251217080151_create_quality_templates.sql`
8. `supabase/migrations/20260101000001_add_user_profiles_and_auth.sql`
9. `supabase/migrations/20260101000002_add_project_ownership.sql`
10. `supabase/migrations/20260101000003_update_rls_policies.sql`
11. `supabase/migrations/20260101000004_helper_functions.sql`
12. `supabase/migrations/20260101000005_clear_existing_data.sql`

### 4. Configure Authentication

#### Email/Password (Required)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. Configure email settings

#### Microsoft OAuth (Optional)

1. Register an Azure AD application
2. Set redirect URI: `https://[PROJECT-ID].supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Authentication → Providers:
   - Enable "Azure" provider
   - Enter your Azure Client ID and Client Secret
   - Configure redirect URLs

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Database Schema

Main tables:

- `user_profiles` - User profile information
- `projects` - Quality check projects with owner
- `project_members` - Project collaboration and sharing
- `datasets` - Uploaded datasets
- `dataset_columns` - Dataset column metadata
- `quality_dimension_config` - Configurable quality dimensions
- `dimension_configurations` - Dimension-specific configurations
- `quality_rules` - Quality check rules
- `quality_results` - Quality check execution results
- `templates` - Saved quality check templates (user-specific)
- `reference_data_files` - Reference data for validation

## Security Features

- **Row-Level Security (RLS)**: All tables protected by PostgreSQL RLS policies
- **Role-Based Access**: Owner/Editor/Viewer permissions on projects
- **User Isolation**: Users can only access their own projects and shared projects
- **Secure Authentication**: PKCE flow for OAuth, bcrypt for password hashing
- **Cascading Deletes**: Automatic cleanup when users/projects are deleted

## Development

This project uses:
- ESLint for code linting
- TypeScript for type safety
- Vite for fast development and HMR
- Tailwind CSS for styling

## Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be in `dist/`

3. Deploy to your hosting service (Vercel, Netlify, etc.)

4. Set environment variables in your hosting platform:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (production URL)

5. Update Azure OAuth redirect URIs if using Microsoft login

## License

Copyright © 2024 AEM Enersol. All rights reserved.
