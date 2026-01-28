# Quick Start Guide

Get your Python backend + React frontend running locally in 5 minutes!

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for database)

## Option 1: Docker Compose (Easiest)

### 1. Start Everything

```bash
# Start backend with database
cd backend
docker-compose up -d

# Install Python dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# In another terminal, start frontend
cd ..
npm install
npm run dev
```

### 2. Access the App

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs

### 3. Test It

1. Open http://localhost:5173
2. Register a new account
3. Create a project
4. Upload a CSV file
5. Run quality checks

---

## Option 2: Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# If using Docker for PostgreSQL only
docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=data_quality_db -p 5432:5432 -d postgres:15-alpine

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
# Install dependencies
npm install

# Setup environment
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start dev server
npm run dev
```

---

## Next Steps

### Deploy to Production

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed instructions on:
- Deploying backend to Render
- Deploying frontend to Vercel
- Setting up production database
- Migrating data from Supabase

### Development

- **Backend**: [backend/README.md](backend/README.md)
- **API Docs**: http://localhost:8000/api/docs
- **Database**: Use pgAdmin or psql to connect to PostgreSQL

### Common Commands

```bash
# Backend
cd backend
uvicorn app.main:app --reload          # Start with hot reload
alembic revision --autogenerate -m ""  # Create migration
alembic upgrade head                   # Apply migrations
pytest                                 # Run tests

# Frontend
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview build
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   React Frontend │              │  FastAPI Backend │    │
│  │   (Port 5173)   │◄────────────►│   (Port 8000)   │    │
│  │                  │   REST API    │                  │    │
│  │  - Vite         │              │  - JWT Auth      │    │
│  │  - TypeScript   │              │  - SQLAlchemy    │    │
│  │  - Tailwind CSS │              │  - Alembic       │    │
│  └──────────────────┘              └──────────────────┘    │
│                                             │                │
│                                             ▼                │
│                                    ┌──────────────────┐    │
│                                    │   PostgreSQL     │    │
│                                    │   (Port 5432)    │    │
│                                    │                  │    │
│                                    │  - Data Storage  │    │
│                                    └──────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Production Deployment:
Frontend → Vercel (https://your-app.vercel.app)
Backend  → Render  (https://your-api.onrender.com)
Database → Render PostgreSQL
```

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'app'`
```bash
# Make sure you're in the backend directory
cd backend
# Activate virtual environment
source venv/bin/activate
```

**Error**: `Connection refused` (database)
```bash
# Check if PostgreSQL is running
docker ps
# If not, start it
docker-compose up -d
```

### Frontend can't connect to backend

**Error**: Network error or CORS
```bash
# Check .env file has correct API URL
cat .env
# Should have: VITE_API_URL=http://localhost:8000/api/v1

# Restart dev server
npm run dev
```

### Database migration fails

```bash
# Reset migrations (WARNING: destroys data)
cd backend
alembic downgrade base
alembic upgrade head
```

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/data_quality_db
SECRET_KEY=generate-with-python-secrets-module
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Need Help?

1. Check backend logs: Backend terminal output
2. Check frontend logs: Browser console (F12)
3. Check API docs: http://localhost:8000/api/docs
4. Read full guide: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

---

## What's Different from Supabase?

| Feature | Supabase (Old) | FastAPI (New) |
|---------|----------------|---------------|
| Authentication | Supabase Auth | JWT tokens |
| Database | Supabase PostgreSQL | Self-hosted PostgreSQL |
| API Calls | `supabase.from('table')` | `apiClient.method()` |
| Real-time | Supabase Realtime | Not included (add Socket.IO if needed) |
| Storage | Supabase Storage | Local/S3 (files in uploads/) |
| Deployment | Supabase | Render (backend) + Vercel (frontend) |

---

Happy coding! 🚀
