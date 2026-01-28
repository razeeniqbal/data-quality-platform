from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import os
import pandas as pd
import shutil

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.dataset import Dataset, DatasetColumn

router = APIRouter()


@router.post("/upload")
async def upload_dataset(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a CSV dataset"""
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Create upload directory if it doesn't exist
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(project_id))
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Read and analyze CSV
    try:
        df = pd.read_csv(file_path)
        row_count = len(df)
        column_count = len(df.columns)
        file_size = os.path.getsize(file_path)

        # Create dataset record
        db_dataset = Dataset(
            project_id=project_id,
            name=file.filename,
            file_path=file_path,
            file_size=file_size,
            row_count=row_count,
            column_count=column_count
        )
        db.add(db_dataset)
        db.flush()

        # Create column metadata
        for col_name in df.columns:
            col_data = df[col_name]
            db_column = DatasetColumn(
                dataset_id=db_dataset.id,
                column_name=col_name,
                data_type=str(col_data.dtype),
                null_count=int(col_data.isnull().sum()),
                unique_count=int(col_data.nunique()),
                sample_values=str(col_data.head(5).tolist())
            )
            db.add(db_column)

        db.commit()
        db.refresh(db_dataset)

        return {
            "dataset_id": db_dataset.id,
            "name": db_dataset.name,
            "row_count": row_count,
            "column_count": column_count
        }

    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@router.get("/{dataset_id}")
async def get_dataset(
    dataset_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dataset details"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: UUID,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Preview dataset contents"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(dataset.file_path, nrows=limit)
        return {
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading dataset: {str(e)}")
