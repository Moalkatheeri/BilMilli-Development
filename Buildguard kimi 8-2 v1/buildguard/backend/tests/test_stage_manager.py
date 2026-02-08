"""Tests for Stage Manager service."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ConstructionStage, StageStatus
from app.services.stage_manager import StageManager


class TestStageManager:
    """Test stage management functionality."""
    
    async def test_create_stages_for_project(self, db_session: AsyncSession, test_project: Project):
        """Test auto-generation of stages for a new project."""
        stage_manager = StageManager(db_session)
        
        # Create stages
        stages = await stage_manager.create_stages_for_project(test_project)
        
        # Verify stages were created
        assert len(stages) == 12  # 12 construction stages
        
        # Verify first stage
        assert stages[0].name == "Foundation & Excavation"
        assert stages[0].sequence == 1
        assert stages[0].status == StageStatus.NOT_STARTED
        
        # Verify last stage
        assert stages[-1].name == "Final Inspections & Handover"
        assert stages[-1].sequence == 12
        
        # Verify payment percentages sum to 100
        total_percentage = sum(s.payment_percentage for s in stages)
        assert abs(total_percentage - 100.0) < 0.01
    
    async def test_can_start_stage_first_stage(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test that first stage can always be started."""
        stage_manager = StageManager(db_session)
        
        # First stage should be startable
        can_start, reasons = await stage_manager.can_start_stage(test_stages[0].id)
        
        assert can_start is True
        assert len(reasons) == 0
    
    async def test_can_start_stage_without_dependency_approval(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test that stage 2 cannot start if stage 1 is not approved."""
        stage_manager = StageManager(db_session)
        
        # Stage 2 should not be startable (stage 1 not approved)
        can_start, reasons = await stage_manager.can_start_stage(test_stages[1].id)
        
        assert can_start is False
        assert len(reasons) > 0
        assert "dependency" in reasons[0].lower() or "approved" in reasons[0].lower()
    
    async def test_start_stage_success(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test starting a stage successfully."""
        stage_manager = StageManager(db_session)
        
        success, message = await stage_manager.start_stage(test_stages[0].id, "user_123")
        
        assert success is True
        assert "started" in message.lower()
        
        # Verify stage status changed
        await db_session.refresh(test_stages[0])
        assert test_stages[0].status == StageStatus.IN_PROGRESS
        assert test_stages[0].actual_start is not None
    
    async def test_submit_stage(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test submitting a stage for approval."""
        stage_manager = StageManager(db_session)
        
        # First start the stage
        await stage_manager.start_stage(test_stages[0].id, "user_123")
        
        # Then submit it
        success, message = await stage_manager.submit_for_approval(test_stages[0].id)
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_stages[0])
        assert test_stages[0].status == StageStatus.PENDING_APPROVAL
    
    async def test_approve_stage(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test approving a stage."""
        stage_manager = StageManager(db_session)
        
        # Start and submit the stage
        await stage_manager.start_stage(test_stages[0].id, "user_123")
        await stage_manager.submit_for_approval(test_stages[0].id)
        
        # Approve it
        success, message = await stage_manager.approve_stage(test_stages[0].id, "consultant_123")
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_stages[0])
        assert test_stages[0].status == StageStatus.APPROVED
        assert test_stages[0].completion_percentage == 100.0
        assert test_stages[0].actual_end is not None
    
    async def test_update_checklist_item(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test updating a checklist item."""
        stage_manager = StageManager(db_session)
        
        # Start the stage first
        await stage_manager.start_stage(test_stages[0].id, "user_123")
        
        # Update first checklist item
        success, message = await stage_manager.update_checklist_item(
            test_stages[0].id, 0, True
        )
        
        assert success is True
        
        # Verify completion percentage updated
        await db_session.refresh(test_stages[0])
        assert test_stages[0].completion_percentage > 0
    
    async def test_stage_lifecycle(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test complete stage lifecycle: NOT_STARTED → IN_PROGRESS → PENDING_APPROVAL → APPROVED."""
        stage_manager = StageManager(db_session)
        stage = test_stages[0]
        
        # Initial state
        assert stage.status == StageStatus.NOT_STARTED
        
        # Start stage
        await stage_manager.start_stage(stage.id, "user_123")
        await db_session.refresh(stage)
        assert stage.status == StageStatus.IN_PROGRESS
        
        # Submit for approval
        await stage_manager.submit_for_approval(stage.id)
        await db_session.refresh(stage)
        assert stage.status == StageStatus.PENDING_APPROVAL
        
        # Approve
        await stage_manager.approve_stage(stage.id, "consultant_123")
        await db_session.refresh(stage)
        assert stage.status == StageStatus.APPROVED
    
    async def test_cannot_approve_without_submission(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test that a stage cannot be approved without being submitted first."""
        stage_manager = StageManager(db_session)
        
        # Start but don't submit
        await stage_manager.start_stage(test_stages[0].id, "user_123")
        
        # Try to approve
        success, message = await stage_manager.approve_stage(test_stages[0].id, "consultant_123")
        
        assert success is False
        assert "pending approval" in message.lower()
