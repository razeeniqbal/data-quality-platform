from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
from uuid import UUID
import pandas as pd
import io

from app.core.database import get_db
from app.models.project import Project
from app.models.dataset import Dataset, DatasetColumn

router = APIRouter()


class DatasetResponse(BaseModel):
    id: str
    project_id: str
    name: str
    file_name: Optional[str]
    row_count: int
    column_count: int
    created_at: str

    class Config:
        from_attributes = True


class DatasetPreview(BaseModel):
    headers: List[str]
    rows: List[dict]
    total_rows: int


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    project_id: UUID = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CSV file as a dataset"""
    # Check project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # Convert to JSON-serializable format
        file_data = df.to_dict(orient='records')
        headers = df.columns.tolist()

        # Create dataset
        db_dataset = Dataset(
            project_id=project_id,
            name=file.filename.replace('.csv', ''),
            file_name=file.filename,
            row_count=len(df),
            column_count=len(headers),
            file_data=file_data
        )
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)

        # Create column records
        for idx, col_name in enumerate(headers):
            db_column = DatasetColumn(
                dataset_id=db_dataset.id,
                column_name=col_name,
                column_index=idx,
                data_type='text'
            )
            db.add(db_column)

        db.commit()

        return DatasetResponse(
            id=str(db_dataset.id),
            project_id=str(db_dataset.project_id),
            name=db_dataset.name,
            file_name=db_dataset.file_name,
            row_count=db_dataset.row_count,
            column_count=db_dataset.column_count,
            created_at=db_dataset.created_at.isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: UUID,
    db: Session = Depends(get_db)
):
    """Get dataset info"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return DatasetResponse(
        id=str(dataset.id),
        project_id=str(dataset.project_id),
        name=dataset.name,
        file_name=dataset.file_name,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        created_at=dataset.created_at.isoformat()
    )


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
async def preview_dataset(
    dataset_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Preview dataset rows"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_data = dataset.file_data or []
    headers = list(file_data[0].keys()) if file_data else []

    return DatasetPreview(
        headers=headers,
        rows=file_data[:limit],
        total_rows=len(file_data)
    )


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(dataset)
    db.commit()
    return None
