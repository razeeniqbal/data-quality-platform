from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.project import Project
from app.models.dataset import Dataset
from app.models.quality import QualityDimensionConfig, QualityRule, QualityResult

router = APIRouter()


class DimensionResponse(BaseModel):
    id: str
    name: str
    key: str
    description: Optional[str]
    icon: str
    color: str
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


class QualityResultResponse(BaseModel):
    id: str
    dataset_id: str
    column_name: str
    dimension: str
    passed_count: int
    failed_count: int
    total_count: int
    score: float

    class Config:
        from_attributes = True


class RunQualityRequest(BaseModel):
    rules: List[dict]


@router.get("/dimensions", response_model=List[DimensionResponse])
async def get_quality_dimensions(
    db: Session = Depends(get_db)
):
    """Get all active quality dimensions"""
    dimensions = db.query(QualityDimensionConfig).filter(
        QualityDimensionConfig.is_active == True
    ).order_by(QualityDimensionConfig.display_order).all()

    # If no dimensions in DB, return defaults
    if not dimensions:
        return [
            DimensionResponse(id="1", name="Completeness", key="completeness", description="Check if all required fields have values", icon="check-circle", color="#14b8a6", is_active=True, display_order=1),
            DimensionResponse(id="2", name="Uniqueness", key="uniqueness", description="Check for duplicate values", icon="fingerprint", color="#8b5cf6", is_active=True, display_order=2),
            DimensionResponse(id="3", name="Consistency", key="consistency", description="Check data format and pattern consistency", icon="shield", color="#f59e0b", is_active=True, display_order=3),
            DimensionResponse(id="4", name="Validity", key="validity", description="Validate data against rules", icon="check-square", color="#ef4444", is_active=True, display_order=4),
        ]

    return [
        DimensionResponse(
            id=str(d.id),
            name=d.name,
            key=d.key,
            description=d.description,
            icon=d.icon,
            color=d.color,
            is_active=d.is_active,
            display_order=d.display_order
        )
        for d in dimensions
    ]


@router.post("/run")
async def run_quality_checks(
    dataset_id: UUID = Query(...),
    db: Session = Depends(get_db)
):
    """Run quality checks on a dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Get dataset data
    file_data = dataset.file_data or []
    if not file_data:
        raise HTTPException(status_code=400, detail="Dataset has no data")

    headers = list(file_data[0].keys())
    results = []

    # Run completeness checks on all columns
    for column in headers:
        passed = 0
        failed = 0
        for row in file_data:
            value = row.get(column)
            if value and str(value).strip():
                passed += 1
            else:
                failed += 1

        total = passed + failed
        score = (passed / total * 100) if total > 0 else 0

        result = QualityResult(
            dataset_id=dataset_id,
            column_name=column,
            dimension="completeness",
            passed_count=passed,
            failed_count=failed,
            total_count=total,
            score=score
        )
        db.add(result)
        results.append({
            "column_name": column,
            "dimension": "completeness",
            "passed_count": passed,
            "failed_count": failed,
            "total_count": total,
            "score": score
        })

    db.commit()

    return {"message": "Quality checks completed", "results": results}


@router.get("/results/{dataset_id}", response_model=List[QualityResultResponse])
async def get_quality_results(
    dataset_id: UUID,
    db: Session = Depends(get_db)
):
    """Get quality results for a dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    results = db.query(QualityResult).filter(
        QualityResult.dataset_id == dataset_id
    ).order_by(QualityResult.dimension).all()

    return [
        QualityResultResponse(
            id=str(r.id),
            dataset_id=str(r.dataset_id),
            column_name=r.column_name,
            dimension=r.dimension,
            passed_count=r.passed_count,
            failed_count=r.failed_count,
            total_count=r.total_count,
            score=r.score
        )
        for r in results
    ]
