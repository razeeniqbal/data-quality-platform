# Migration Guide: Supabase → Python FastAPI + PostgreSQL

This guide will help you migrate from Supabase to a self-hosted Python FastAPI backend with separate deployments on Vercel (frontend) and Render (backend).

## Overview

### Old Architecture
- **Frontend**: React + TypeScript (Vercel-ready)
- **Backend**: Supabase (Auth + Database + Storage)
- **Deployment**: Single Supabase instance

### New Architecture
- **Frontend**: React + TypeScript → **Vercel**
- **Backend**: FastAPI + PostgreSQL → **Render**
- **Database**: PostgreSQL on Render
- **Authentication**: JWT-based custom auth

---

## Part 1: Backend Setup (Local Development)

### 1.1 Install Python Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 1.2 Setup Local PostgreSQL Database

**Option A: Using Docker Compose (Recommended)**
```bash
cd backend
docker-compose up -d
```

**Option B: Local PostgreSQL Installation**
1. Install PostgreSQL 15+
2. Create database:
```sql
CREATE DATABASE data_quality_db;
CREATE USER data_quality_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE data_quality_db TO data_quality_user;
```

### 1.3 Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/data_quality_db
SECRET_KEY=your-secret-key-here-generate-a-strong-one
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 1.4 Run Database Migrations

```bash
cd backend
alembic upgrade head
```

### 1.5 Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit: http://localhost:8000/api/docs for API documentation

---

## Part 2: Frontend Setup (Local Development)

### 2.1 Update Environment Variables

Update your frontend `.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 2.2 Replace Supabase with API Client

The new API client is located at [src/lib/api-client.ts](src/lib/api-client.ts).

**Key changes needed in your components:**

#### Before (Supabase):
```typescript
import { supabase } from './lib/supabase';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

#### After (FastAPI):
```typescript
import { apiClient } from './lib/api-client';

// Login
const data = await apiClient.login(email, password);
```

### 2.3 Update Auth Context

You'll need to update [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) to use the new API client instead of Supabase. Key changes:

1. Replace `supabase.auth.signIn` with `apiClient.login`
2. Replace `supabase.auth.signUp` with `apiClient.register`
3. Replace `supabase.auth.signOut` with `apiClient.logout`
4. Replace `supabase.auth.getUser` with `apiClient.getCurrentUser`
5. Update token storage to use localStorage

### 2.4 Test Locally

```bash
npm run dev
```

---

## Part 3: Deploy Backend to Render

### 3.1 Prepare Repository

1. Push your code to GitHub:
```bash
git add backend/
git commit -m "Add Python FastAPI backend"
git push origin main
```

### 3.2 Create Render Account

1. Go to https://render.com
2. Sign up or log in
3. Connect your GitHub account

### 3.3 Deploy Database

1. Click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `data-quality-db`
   - **Database**: `data_quality`
   - **User**: `data_quality_user`
   - **Region**: Choose closest to your users
   - **Plan**: Starter ($7/month) or Free
3. Click "Create Database"
4. Save the **Internal Database URL** (starts with `postgresql://`)

### 3.4 Deploy Backend Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `data-quality-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Starter ($7/month) or Free

4. Add Environment Variables:
   - `DATABASE_URL`: Paste Internal Database URL from step 3.3
   - `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - `ALGORITHM`: `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `30`
   - `FRONTEND_URL`: `https://your-app.vercel.app` (update later)
   - `ENVIRONMENT`: `production`
   - `PYTHON_VERSION`: `3.11.0`

5. Click "Create Web Service"

6. Wait for deployment (5-10 minutes)

7. Your API will be available at: `https://data-quality-api.onrender.com`

### 3.5 Test Backend

```bash
curl https://your-backend.onrender.com/health
```

Should return: `{"status":"healthy"}`

---

## Part 4: Deploy Frontend to Vercel

### 4.1 Prepare Frontend

1. Update production environment:
```bash
cp .env.production.example .env.production
```

Edit `.env.production`:
```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

### 4.2 Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com
2. Sign up or log in
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api/v1`
7. Click "Deploy"

### 4.3 Update Backend CORS

After getting your Vercel URL, update backend environment variable on Render:

1. Go to Render Dashboard → Your Web Service
2. Environment → Edit
3. Update `FRONTEND_URL`: `https://your-app.vercel.app`
4. Save (triggers redeploy)

---

## Part 5: Data Migration from Supabase

### 5.1 Export Data from Supabase

1. Go to Supabase Dashboard → Database
2. For each table, run:
```sql
COPY (SELECT * FROM your_table) TO STDOUT WITH CSV HEADER;
```
3. Save outputs as CSV files

### 5.2 Import Data to New Database

**Using pgAdmin or psql:**

```bash
psql -h your-render-db-host -U data_quality_user -d data_quality -c "\COPY users FROM 'users.csv' CSV HEADER;"
psql -h your-render-db-host -U data_quality_user -d data_quality -c "\COPY projects FROM 'projects.csv' CSV HEADER;"
# Repeat for all tables
```

### 5.3 Update User Passwords

Since password hashing may differ, users will need to:
1. Use "Forgot Password" to reset, OR
2. You can run a script to re-hash passwords

---

## Part 6: Testing the Migration

### 6.1 Test Authentication

1. Visit your Vercel app
2. Register a new account
3. Login
4. Verify JWT token is stored in localStorage

### 6.2 Test Project Creation

1. Create a new project
2. Upload a dataset
3. Configure quality checks
4. Run checks

### 6.3 Test API Endpoints

```bash
# Register
curl -X POST https://your-backend.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST https://your-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Get projects (use token from login)
curl https://your-backend.onrender.com/api/v1/projects/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Part 7: Troubleshooting

### Backend Issues

**Problem**: Database connection fails
```
Solution: Check DATABASE_URL format: postgresql://user:password@host:port/database
```

**Problem**: CORS errors
```
Solution: Verify FRONTEND_URL in backend environment matches your Vercel URL exactly
```

**Problem**: 500 errors
```
Solution: Check Render logs: Dashboard → Your Service → Logs
```

### Frontend Issues

**Problem**: API calls fail with network error
```
Solution: Verify VITE_API_URL is correct and backend is running
```

**Problem**: Authentication not working
```
Solution: Check localStorage for access_token, verify JWT secret matches
```

---

## Part 8: Cost Comparison

### Supabase
- Free tier: Limited
- Pro: $25/month

### New Setup (Render + Vercel)
- **Vercel**: Free for hobby projects
- **Render Database**: $7/month (Starter) or Free (limited)
- **Render Web Service**: $7/month (Starter) or Free (spin down after inactivity)
- **Total**: $14/month or Free with limitations

---

## Part 9: Maintenance

### Database Backups

Render provides automatic backups on paid plans. For free tier:

```bash
# Manual backup
pg_dump -h your-host -U user database > backup.sql

# Restore
psql -h your-host -U user database < backup.sql
```

### Monitoring

1. Render Dashboard: Monitor CPU, Memory, Logs
2. Vercel Analytics: Monitor frontend performance
3. Add Sentry for error tracking (optional)

### Scaling

When you need to scale:
1. Upgrade Render plans for more resources
2. Add Redis for caching
3. Implement background job queue (Celery)
4. Use CDN for static assets

---

## Questions?

Check:
- Backend API docs: `https://your-backend.onrender.com/api/docs`
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
