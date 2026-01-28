from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.project import Project, ProjectMember, ProjectRole
from app.schemas.project import (
    Project as ProjectSchema,
    ProjectCreate,
    ProjectUpdate,
    ProjectWithMembers,
    ProjectMemberCreate
)

router = APIRouter()


def check_project_access(
    project_id: UUID,
    user: User,
    db: Session,
    required_role: ProjectRole = ProjectRole.VIEWER
) -> Project:
    """Check if user has access to project with required role"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Owner has all access
    if project.owner_id == user.id:
        return project

    # Check membership
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check role permissions
    role_hierarchy = {
        ProjectRole.VIEWER: 1,
        ProjectRole.EDITOR: 2,
        ProjectRole.OWNER: 3
    }

    if role_hierarchy.get(membership.role, 0) < role_hierarchy.get(required_role, 0):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return project


@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    db_project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/", response_model=List[ProjectSchema])
async def list_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all projects accessible to the user"""
    # Get owned projects
    owned = db.query(Project).filter(Project.owner_id == current_user.id).all()

    # Get projects where user is a member
    memberships = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user.id
    ).all()
    member_project_ids = [m.project_id for m in memberships]
    member_projects = db.query(Project).filter(Project.id.in_(member_project_ids)).all()

    # Combine and deduplicate
    all_projects = {p.id: p for p in owned + member_projects}
    return list(all_projects.values())


@router.get("/{project_id}", response_model=ProjectWithMembers)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project details"""
    project = check_project_access(project_id, current_user, db)
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update project (requires editor role)"""
    project = check_project_access(project_id, current_user, db, ProjectRole.EDITOR)

    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete project (owner only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete project")

    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add member to project (owner only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can add members")

    # Check if already a member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    db_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member
