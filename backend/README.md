# Data Quality Platform - FastAPI Backend

Python FastAPI backend for the Data Quality Platform with PostgreSQL database, JWT authentication, and REST APIs.

## Features

- **FastAPI Framework**: Modern, fast, async Python web framework
- **SQLAlchemy ORM**: Database models and queries
- **Alembic Migrations**: Database schema version control
- **JWT Authentication**: Secure token-based auth
- **PostgreSQL Database**: Robust relational database
- **Docker Support**: Containerized deployment
- **OpenAPI Documentation**: Auto-generated API docs

## Tech Stack

- Python 3.11+
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL 15+
- Alembic
- JWT (python-jose)
- Pandas (data processing)

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ OR Docker

### Installation

1. **Clone and navigate to backend**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/data_quality_db
SECRET_KEY=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

Generate secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

5. **Start database (Docker Compose)**
```bash
docker-compose up -d
```

6. **Run migrations**
```bash
alembic upgrade head
```

7. **Start server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit:
- API: http://localhost:8000
- Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Project Structure

```
backend/
├── alembic/              # Database migrations
│   ├── versions/         # Migration files
│   └── env.py
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/   # API endpoints
│   │       │   ├── auth.py
│   │       │   ├── projects.py
│   │       │   ├── datasets.py
│   │       │   └── quality.py
│   │       └── __init__.py
│   ├── core/               # Core functionality
│   │   ├── config.py       # Settings
│   │   ├── database.py     # DB connection
│   │   └── security.py     # Auth & JWT
│   ├── models/             # SQLAlchemy models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── dataset.py
│   │   └── quality.py
│   ├── schemas/            # Pydantic schemas
│   │   ├── user.py
│   │   └── project.py
│   ├── services/           # Business logic
│   └── main.py            # FastAPI app
├── tests/                 # Test files
├── uploads/              # File uploads
├── .env.example          # Environment template
├── alembic.ini           # Alembic config
├── docker-compose.yml    # Local development
├── Dockerfile            # Production image
├── requirements.txt      # Dependencies
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (get JWT token)
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Projects
- `GET /api/v1/projects/` - List projects
- `POST /api/v1/projects/` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project
- `POST /api/v1/projects/{id}/members` - Add member

### Datasets
- `POST /api/v1/datasets/upload` - Upload CSV
- `GET /api/v1/datasets/{id}` - Get dataset
- `GET /api/v1/datasets/{id}/preview` - Preview data

### Quality
- `GET /api/v1/quality/dimensions` - Get dimensions
- `POST /api/v1/quality/run` - Run quality checks
- `GET /api/v1/quality/results/{id}` - Get results

Full API documentation: http://localhost:8000/api/docs

## Database Migrations

### Create new migration
```bash
alembic revision --autogenerate -m "description"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback migration
```bash
alembic downgrade -1
```

### View migration history
```bash
alembic history
```

## Development

### Run with hot reload
```bash
uvicorn app.main:app --reload
```

### Run tests
```bash
pytest
```

### Code formatting
```bash
black app/
```

### Linting
```bash
flake8 app/
```

## Docker

### Build image
```bash
docker build -t data-quality-api .
```

### Run container
```bash
docker run -p 8000:8000 --env-file .env data-quality-api
```

### Docker Compose (local dev)
```bash
docker-compose up
```

## Deployment

### Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Set environment variables:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `SECRET_KEY`
   - `FRONTEND_URL`
4. Deploy!

See [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) for detailed deployment instructions.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT signing key | Required |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration | 30 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `UPLOAD_DIR` | File upload directory | ./uploads |
| `MAX_UPLOAD_SIZE` | Max file size (bytes) | 10485760 (10MB) |
| `ENVIRONMENT` | Environment name | development |

## Security

- **JWT Authentication**: Token-based auth with expiration
- **Password Hashing**: Bcrypt for password storage
- **CORS**: Configured for frontend domain
- **SQL Injection**: Protected by SQLAlchemy ORM
- **File Upload**: Size limits and type validation

## Performance

- **Async/Await**: Non-blocking I/O operations
- **Connection Pooling**: SQLAlchemy pool management
- **Lazy Loading**: Efficient database queries

## Troubleshooting

### Database connection error
```
Check DATABASE_URL format:
postgresql://user:password@host:port/database
```

### Migration fails
```bash
# Reset database (WARNING: destroys data)
alembic downgrade base
alembic upgrade head
```

### Import errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Run linting: `flake8 app/`
5. Format code: `black app/`
6. Submit PR

## License

Copyright © 2024 AEM Enersol. All rights reserved.
