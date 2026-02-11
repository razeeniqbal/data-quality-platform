from fastapi import APIRouter
from app.api.v1.endpoints import projects, datasets, quality

router = APIRouter()

router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
router.include_router(quality.router, prefix="/quality", tags=["Quality"])
