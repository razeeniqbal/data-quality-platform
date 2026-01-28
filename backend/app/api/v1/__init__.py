from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, datasets, quality

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
router.include_router(quality.router, prefix="/quality", tags=["Quality"])
