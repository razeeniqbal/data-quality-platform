from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, TypeDecorator, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


# UUID type that works with both SQLite and PostgreSQL
class GUID(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(value)


class QualityDimensionConfig(Base):
    __tablename__ = "quality_dimension_config"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    key = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(50), default="check-circle")
    color = Column(String(20), default="#14b8a6")
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class QualityRule(Base):
    __tablename__ = "quality_rules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    column_name = Column(String(255), nullable=False)
    dimension = Column(String(50), nullable=False)
    rule_type = Column(String(100), nullable=False)
    rule_config = Column(JSON)  # Works with SQLite and PostgreSQL
    description = Column(Text)
    status = Column(String(20), default="ready")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QualityResult(Base):
    __tablename__ = "quality_results"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(GUID(), ForeignKey("quality_rules.id", ondelete="CASCADE"))
    column_name = Column(String(255), nullable=False)
    dimension = Column(String(50), nullable=False)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    result_data = Column(JSON)  # Works with SQLite and PostgreSQL
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset = relationship("Dataset", back_populates="quality_results")
