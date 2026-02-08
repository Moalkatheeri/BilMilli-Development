"""
Stage Manager Service - Pillar 1: Project & Stage Lifecycle

This service handles:
1. Auto-generation of construction stages when a project is created
2. State transition enforcement (can't start Stage 2 if Stage 1 not approved)
3. Stage gating logic
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.project import Project, ConstructionStage, StageStatus

# Default stage templates for UAE villa construction
DEFAULT_STAGE_TEMPLATES = [
    {
        "name": "Mobilization & Site Setup",
        "description": "Site office, fencing, utilities, access roads",
        "phase": "pre_construction",
        "sequence": 1,
        "payment_percentage": 2.0,
        "checklist_items": [
            {"item": "Site office installed", "completed": False},
            {"item": "Perimeter fencing complete", "completed": False},
            {"item": "Temporary utilities connected", "completed": False},
            {"item": "Site access established", "completed": False},
        ]
    },
    {
        "name": "Excavation & Shoring",
        "description": "Site excavation, shoring installation, dewatering",
        "phase": "foundation",
        "sequence": 2,
        "payment_percentage": 5.0,
        "checklist_items": [
            {"item": "Excavation to required depth", "completed": False},
            {"item": "Shoring walls installed", "completed": False},
            {"item": "Dewatering system operational", "completed": False},
            {"item": "Soil compaction tested", "completed": False},
        ]
    },
    {
        "name": "Foundation Concrete",
        "description": "Raft foundation, grade beams, basement slab",
        "phase": "foundation",
        "sequence": 3,
        "payment_percentage": 10.0,
        "checklist_items": [
            {"item": "Reinforcement inspected", "completed": False},
            {"item": "Formwork complete", "completed": False},
            {"item": "Concrete poured", "completed": False},
            {"item": "Curing complete", "completed": False},
            {"item": "Concrete strength tested", "completed": False},
        ]
    },
    {
        "name": "Ground Floor Structure",
        "description": "Columns, beams, slab for ground floor",
        "phase": "structure",
        "sequence": 4,
        "payment_percentage": 12.0,
        "checklist_items": [
            {"item": "Column reinforcement installed", "completed": False},
            {"item": "Column concrete poured", "completed": False},
            {"item": "Beam formwork complete", "completed": False},
            {"item": "Slab formwork complete", "completed": False},
            {"item": "Slab concrete poured", "completed": False},
        ]
    },
    {
        "name": "First Floor Structure",
        "description": "Columns, beams, slab for first floor",
        "phase": "structure",
        "sequence": 5,
        "payment_percentage": 12.0,
        "checklist_items": [
            {"item": "Column reinforcement installed", "completed": False},
            {"item": "Column concrete poured", "completed": False},
            {"item": "Beam formwork complete", "completed": False},
            {"item": "Slab formwork complete", "completed": False},
            {"item": "Slab concrete poured", "completed": False},
        ]
    },
    {
        "name": "Roof Structure",
        "description": "Roof beams, slab, waterproofing",
        "phase": "structure",
        "sequence": 6,
        "payment_percentage": 10.0,
        "checklist_items": [
            {"item": "Roof structure complete", "completed": False},
            {"item": "Waterproofing applied", "completed": False},
            {"item": "Waterproofing tested", "completed": False},
            {"item": "Insulation installed", "completed": False},
        ]
    },
    {
        "name": "MEP Rough-in",
        "description": "Electrical, plumbing, HVAC rough installations",
        "phase": "mep",
        "sequence": 7,
        "payment_percentage": 8.0,
        "checklist_items": [
            {"item": "Electrical conduits installed", "completed": False},
            {"item": "Plumbing pipes installed", "completed": False},
            {"item": "HVAC ducts installed", "completed": False},
            {"item": "MEP pressure tested", "completed": False},
        ]
    },
    {
        "name": "External Envelope",
        "description": "Walls, windows, external doors",
        "phase": "finishes",
        "sequence": 8,
        "payment_percentage": 10.0,
        "checklist_items": [
            {"item": "Blockwork walls complete", "completed": False},
            {"item": "External plaster complete", "completed": False},
            {"item": "Windows installed", "completed": False},
            {"item": "External doors installed", "completed": False},
            {"item": "Waterproofing complete", "completed": False},
        ]
    },
    {
        "name": "Internal Finishes",
        "description": "Plaster, paint, flooring, ceilings",
        "phase": "finishes",
        "sequence": 9,
        "payment_percentage": 15.0,
        "checklist_items": [
            {"item": "Internal plaster complete", "completed": False},
            {"item": "Painting complete", "completed": False},
            {"item": "Flooring installed", "completed": False},
            {"item": "Ceilings installed", "completed": False},
            {"item": "Skirting installed", "completed": False},
        ]
    },
    {
        "name": "MEP Fit-out",
        "description": "Fixtures, outlets, AC units, sanitary ware",
        "phase": "mep",
        "sequence": 10,
        "payment_percentage": 8.0,
        "checklist_items": [
            {"item": "Electrical fixtures installed", "completed": False},
            {"item": "Sanitary ware installed", "completed": False},
            {"item": "AC units installed", "completed": False},
            {"item": "MEP systems commissioned", "completed": False},
        ]
    },
    {
        "name": "Kitchen & Wardrobes",
        "description": "Kitchen cabinets, countertops, built-in wardrobes",
        "phase": "finishes",
        "sequence": 11,
        "payment_percentage": 5.0,
        "checklist_items": [
            {"item": "Kitchen cabinets installed", "completed": False},
            {"item": "Countertops installed", "completed": False},
            {"item": "Appliances installed", "completed": False},
            {"item": "Wardrobes installed", "completed": False},
        ]
    },
    {
        "name": "External Works",
        "description": "Landscaping, driveway, boundary wall",
        "phase": "finishes",
        "sequence": 12,
        "payment_percentage": 3.0,
        "checklist_items": [
            {"item": "Driveway complete", "completed": False},
            {"item": "Boundary wall complete", "completed": False},
            {"item": "Landscaping complete", "completed": False},
            {"item": "External lighting installed", "completed": False},
        ]
    },
]


class StageManager:
    """Manages construction stage lifecycle and gating"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_stages_for_project(self, project: Project) -> List[ConstructionStage]:
        """
        Auto-generate construction stages when a project is created.
        Returns the list of created stages.
        """
        stages = []
        contract_value = project.contract_value
        
        # Calculate planned dates (spread over project duration)
        project_duration_days = (project.expected_completion - project.start_date).days
        days_per_stage = project_duration_days // len(DEFAULT_STAGE_TEMPLATES)
        
        for i, template in enumerate(DEFAULT_STAGE_TEMPLATES):
            # Calculate dates
            planned_start = project.start_date + timedelta(days=i * days_per_stage)
            planned_end = planned_start + timedelta(days=days_per_stage)
            
            # Calculate payment amount
            payment_amount = contract_value * (template["payment_percentage"] / 100)
            
            stage = ConstructionStage(
                project_id=project.id,
                name=template["name"],
                description=template["description"],
                sequence=template["sequence"],
                phase=template["phase"],
                status=StageStatus.NOT_STARTED,
                planned_start=planned_start,
                planned_end=planned_end,
                checklist_items=template["checklist_items"],
                payment_percentage=template["payment_percentage"],
                payment_amount=payment_amount,
                depends_on=[] if i == 0 else [DEFAULT_STAGE_TEMPLATES[i-1]["name"]]
            )
            
            self.db.add(stage)
            stages.append(stage)
        
        await self.db.flush()
        return stages
    
    async def can_start_stage(self, stage_id: str) -> tuple[bool, List[str]]:
        """
        Check if a stage can be started.
        Returns (can_start, list_of_blocking_reasons).
        """
        # Get the stage
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            return False, ["Stage not found"]
        
        reasons = []
        
        # Check if already started or completed
        if stage.status in [StageStatus.IN_PROGRESS, StageStatus.APPROVED]:
            return False, [f"Stage is already {stage.status.value}"]
        
        # Get all stages for this project
        result = await self.db.execute(
            select(ConstructionStage)
            .where(ConstructionStage.project_id == stage.project_id)
            .order_by(ConstructionStage.sequence)
        )
        all_stages = result.scalars().all()
        
        # Create a map for easy lookup
        stage_map = {s.sequence: s for s in all_stages}
        
        # Check dependencies (previous stages must be approved)
        if stage.sequence > 1:
            prev_stage = stage_map.get(stage.sequence - 1)
            if prev_stage and prev_stage.status != StageStatus.APPROVED:
                reasons.append(
                    f"Previous stage '{prev_stage.name}' must be approved first (currently: {prev_stage.status.value})"
                )
        
        return len(reasons) == 0, reasons
    
    async def start_stage(self, stage_id: str, user_id: str) -> tuple[bool, str]:
        """
        Attempt to start a stage. Returns (success, message).
        """
        can_start, reasons = await self.can_start_stage(stage_id)
        
        if not can_start:
            return False, f"Cannot start stage: {'; '.join(reasons)}"
        
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        stage.status = StageStatus.IN_PROGRESS
        stage.actual_start = datetime.utcnow()
        
        await self.db.flush()
        return True, f"Stage '{stage.name}' started successfully"
    
    async def submit_for_approval(self, stage_id: str) -> tuple[bool, str]:
        """Submit a stage for approval"""
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            return False, "Stage not found"
        
        if stage.status != StageStatus.IN_PROGRESS:
            return False, f"Stage must be in progress to submit (currently: {stage.status.value})"
        
        # Check if all checklist items are complete
        incomplete_items = [
            item for item in stage.checklist_items 
            if not item.get("completed", False)
        ]
        
        if incomplete_items:
            return False, f"Cannot submit: {len(incomplete_items)} checklist item(s) incomplete"
        
        stage.status = StageStatus.PENDING_APPROVAL
        await self.db.flush()
        
        return True, f"Stage '{stage.name}' submitted for approval"
    
    async def approve_stage(self, stage_id: str, approved_by: str) -> tuple[bool, str]:
        """Approve a stage and release payment"""
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            return False, "Stage not found"
        
        if stage.status != StageStatus.PENDING_APPROVAL:
            return False, f"Stage must be pending approval (currently: {stage.status.value})"
        
        stage.status = StageStatus.APPROVED
        stage.actual_end = datetime.utcnow()
        stage.completion_percentage = 100.0
        
        await self.db.flush()
        
        return True, f"Stage '{stage.name}' approved"
    
    async def reject_stage(self, stage_id: str, reason: str) -> tuple[bool, str]:
        """Reject a stage submission"""
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            return False, "Stage not found"
        
        if stage.status != StageStatus.PENDING_APPROVAL:
            return False, f"Stage must be pending approval (currently: {stage.status.value})"
        
        stage.status = StageStatus.REJECTED
        # Add rejection reason to checklist or notes
        
        await self.db.flush()
        
        return True, f"Stage '{stage.name}' rejected: {reason}"
    
    async def update_checklist_item(
        self, stage_id: str, item_index: int, completed: bool
    ) -> tuple[bool, str]:
        """Update a checklist item's completion status"""
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            return False, "Stage not found"
        
        if item_index < 0 or item_index >= len(stage.checklist_items):
            return False, "Invalid checklist item index"
        
        stage.checklist_items[item_index]["completed"] = completed
        
        # Recalculate completion percentage
        completed_count = sum(
            1 for item in stage.checklist_items 
            if item.get("completed", False)
        )
        stage.completion_percentage = (completed_count / len(stage.checklist_items)) * 100
        
        await self.db.flush()
        
        return True, "Checklist updated"
