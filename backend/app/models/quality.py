from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class QualityDimensionConfig(Base):
    __tablename__ = "quality_dimension_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    dimension_name = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, default=True)
    weight = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    configurations = relationship("DimensionConfiguration", back_populates="dimension", cascade="all, delete-orphan")


class DimensionConfiguration(Base):
    __tablename__ = "dimension_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id = Column(UUID(as_uuid=True), ForeignKey("quality_dimension_config.id", ondelete="CASCADE"), nullable=False, unique=True)
    rule_type = Column(String(100))
    threshold = Column(Float)
    column_name = Column(String(255))
    reference_file_id = Column(UUID(as_uuid=True), ForeignKey("reference_data_files.id", ondelete="SET NULL"))
    additional_config = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dimension = relationship("QualityDimensionConfig", back_populates="configurations")
    reference_file = relationship("ReferenceDataFile")


class QualityRule(Base):
    __tablename__ = "quality_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    dimension_name = Column(String(100), nullable=False)
    rule_type = Column(String(100), nullable=False)
    column_name = Column(String(255))
    threshold = Column(Float)
    configuration = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QualityResult(Base):
    __tablename__ = "quality_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    dimension_name = Column(String(100), nullable=False)
    score = Column(Float)
    passed = Column(Boolean)
    details = Column(JSONB)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset = relationship("Dataset", back_populates="quality_results")


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    configuration = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReferenceDataFile(Base):
    __tablename__ = "reference_data_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
