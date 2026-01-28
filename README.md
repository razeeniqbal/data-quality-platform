# Data Quality Platform

A comprehensive data quality checking platform built with React, TypeScript, and Python FastAPI.

## Features

- **User Authentication**: JWT-based authentication with email/password
- **Project Management**: Create and manage data quality projects with role-based access (Owner/Editor/Viewer)
- **Collaborative Sharing**: Share projects with team members
- **Quality Dimensions**: Configure multiple quality dimensions (Completeness, Consistency, Validity, Uniqueness, Accuracy, Timeliness)
- **Template System**: Save and reuse quality check configurations
- **CSV Upload**: Upload datasets and configure quality checks
- **Results Analysis**: Detailed quality check results with metrics and visualization

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL 15+
- Alembic (migrations)
- JWT Authentication
- Pandas (data processing)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ OR Docker

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd data-quality-platform
```

2. **Start Backend**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start database with Docker
docker-compose up -d

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

Backend will run at: http://localhost:8000
API Docs: http://localhost:8000/api/docs

3. **Start Frontend**
```bash
# In a new terminal
npm install
npm run dev
```

Frontend will run at: http://localhost:5173

### Environment Variables

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000/api/v1
```

**Backend (.env)**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/data_quality_db
SECRET_KEY=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

## Project Structure

```
data-quality-platform/
├── backend/                # Python FastAPI backend
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core functionality
│   │   ├── models/        # Database models
│   │   └── schemas/       # Pydantic schemas
│   ├── alembic/           # Database migrations
│   ├── Dockerfile         # Production deployment
│   └── requirements.txt   # Python dependencies
│
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── lib/              # API client & utilities
│   ├── pages/            # Page components
│   └── types/            # TypeScript types
│
└── public/               # Static assets
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set environment variable: `VITE_API_URL`
3. Deploy!

### Backend (Render)
1. Create PostgreSQL database on Render
2. Create Web Service pointing to `/backend`
3. Set environment variables (DATABASE_URL, SECRET_KEY, etc.)
4. Deploy!

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed deployment instructions.

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Deployment guide
- **[backend/README.md](backend/README.md)** - Backend documentation
- **API Docs** - http://localhost:8000/api/docs (when running)

## Available Scripts

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # Type checking
```

### Backend
```bash
uvicorn app.main:app --reload          # Start with hot reload
alembic revision --autogenerate -m ""  # Create migration
alembic upgrade head                   # Apply migrations
pytest                                 # Run tests
black app/                            # Format code
flake8 app/                           # Lint code
```

## Database Schema

Main tables:

- `users` - User accounts and authentication
- `user_profiles` - User profile information
- `projects` - Quality check projects
- `project_members` - Project collaboration
- `datasets` - Uploaded datasets
- `dataset_columns` - Dataset column metadata
- `quality_dimension_config` - Quality dimensions
- `dimension_configurations` - Dimension-specific configs
- `quality_rules` - Quality check rules
- `quality_results` - Check execution results
- `templates` - Saved templates
- `reference_data_files` - Reference data for validation

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt for password storage
- **Role-Based Access**: Owner/Editor/Viewer permissions
- **CORS Protection**: Configured for frontend domain
- **SQL Injection Protection**: SQLAlchemy ORM
- **File Upload Validation**: Size limits and type checking

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Projects
- `GET /api/v1/projects/` - List projects
- `POST /api/v1/projects/` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Datasets
- `POST /api/v1/datasets/upload` - Upload CSV
- `GET /api/v1/datasets/{id}` - Get dataset
- `GET /api/v1/datasets/{id}/preview` - Preview data

### Quality Checks
- `GET /api/v1/quality/dimensions` - Get dimensions
- `POST /api/v1/quality/run` - Run quality checks
- `GET /api/v1/quality/results/{id}` - Get results

Full API documentation available at `/api/docs` when server is running.

## Development

### Run Tests
```bash
# Backend
cd backend
pytest

# Frontend
npm test
```

### Database Migrations
```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Quality
```bash
# Backend
black app/          # Format
flake8 app/         # Lint

# Frontend
npm run lint        # ESLint
npm run typecheck   # TypeScript
```

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.11+)
- Verify virtual environment is activated
- Check DATABASE_URL in `.env`

### Frontend can't connect to backend
- Verify backend is running at http://localhost:8000
- Check `VITE_API_URL` in `.env`
- Check browser console for errors

### Database connection fails
- Ensure PostgreSQL is running: `docker ps`
- Verify DATABASE_URL format
- Check database exists

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

Copyright © 2024 AEM Enersol. All rights reserved.

## Support

For issues or questions:
- Check documentation in `/docs`
- Review API docs at `/api/docs`
- Open an issue on GitHub
