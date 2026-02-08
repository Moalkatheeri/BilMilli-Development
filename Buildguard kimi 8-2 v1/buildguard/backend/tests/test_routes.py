"""Integration tests for API routes."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ConstructionStage, StageStatus
from app.models.user import User


class TestProjectRoutes:
    """Test project API endpoints."""
    
    async def test_list_projects_unauthorized(self, client: AsyncClient):
        """Test that listing projects requires authentication."""
        response = await client.get("/api/projects/")
        assert response.status_code == 401
    
    async def test_list_projects_authorized(self, auth_client: AsyncClient, test_project: Project):
        """Test listing projects when authenticated."""
        response = await auth_client.get("/api/projects/")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1
    
    async def test_get_project(self, auth_client: AsyncClient, test_project: Project):
        """Test getting a specific project."""
        response = await auth_client.get(f"/api/projects/{test_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_project.id
        assert data["name"] == test_project.name
    
    async def test_create_project(self, auth_client: AsyncClient):
        """Test creating a new project."""
        response = await auth_client.post("/api/projects/", json={
            "name": "New Test Project",
            "address": "456 New Street, Dubai",
            "location": "Dubai",
            "contract_value": 1500000.0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Test Project"
        assert data["progress"] == 0.0


class TestStageRoutes:
    """Test stage API endpoints."""
    
    async def test_list_stages(self, auth_client: AsyncClient, test_project: Project, test_stages: list):
        """Test listing stages for a project."""
        response = await auth_client.get(f"/api/stages/project/{test_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == len(test_stages)
    
    async def test_start_stage(self, auth_client: AsyncClient, test_stages: list):
        """Test starting a stage."""
        response = await auth_client.post(f"/api/stages/{test_stages[0].id}/start", json={
            "user_id": "test_user"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "started" in data["message"].lower()
    
    async def test_submit_stage(self, auth_client: AsyncClient, test_stages: list):
        """Test submitting a stage for approval."""
        # First start the stage
        await auth_client.post(f"/api/stages/{test_stages[0].id}/start", json={"user_id": "test_user"})
        
        # Then submit it
        response = await auth_client.post(f"/api/stages/{test_stages[0].id}/submit", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    async def test_approve_stage(self, auth_client: AsyncClient, test_stages: list):
        """Test approving a stage."""
        # Start and submit
        await auth_client.post(f"/api/stages/{test_stages[0].id}/start", json={"user_id": "test_user"})
        await auth_client.post(f"/api/stages/{test_stages[0].id}/submit", json={})
        
        # Approve
        response = await auth_client.post(f"/api/stages/{test_stages[0].id}/approve", json={
            "approved_by": "consultant"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestDeviationRoutes:
    """Test deviation API endpoints."""
    
    async def test_list_deviations(self, auth_client: AsyncClient, test_project: Project, test_deviation):
        """Test listing deviations for a project."""
        response = await auth_client.get(f"/api/deviations/project/{test_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    async def test_get_deviation_summary(self, auth_client: AsyncClient, test_project: Project):
        """Test getting deviation summary."""
        response = await auth_client.get(f"/api/deviations/project/{test_project.id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_severity" in data
        assert "by_status" in data
    
    async def test_check_position(self, auth_client: AsyncClient, test_project: Project):
        """Test position deviation check."""
        response = await auth_client.post("/api/deviations/check-position", json={
            "project_id": test_project.id,
            "element_id": "wall_test",
            "element_type": "wall",
            "expected_position": {"x": 0, "y": 0, "z": 0},
            "actual_position": {"x": 50, "y": 0, "z": 0}
        })
        assert response.status_code == 200
        data = response.json()
        assert "has_deviation" in data
    
    async def test_accept_deviation(self, auth_client: AsyncClient, test_deviation):
        """Test accepting a deviation."""
        response = await auth_client.post(f"/api/deviations/{test_deviation.id}/accept", json={
            "reviewed_by": "consultant",
            "notes": "Acceptable"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    async def test_rectify_deviation(self, auth_client: AsyncClient, test_deviation):
        """Test marking a deviation as rectified."""
        # First reject it
        await auth_client.post(f"/api/deviations/{test_deviation.id}/reject", json={
            "reviewed_by": "consultant",
            "notes": "Fix required"
        })
        
        # Then rectify
        response = await auth_client.post(f"/api/deviations/{test_deviation.id}/rectify", json={
            "notes": "Fixed",
            "actual_cost": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestPaymentRoutes:
    """Test payment API endpoints."""
    
    async def test_list_payment_gates(self, auth_client: AsyncClient, test_project: Project, test_payment_gate):
        """Test listing payment gates."""
        response = await auth_client.get(f"/api/payments/gates/project/{test_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    async def test_check_payment_readiness(self, auth_client: AsyncClient, test_payment_gate):
        """Test checking payment readiness."""
        response = await auth_client.post(f"/api/payments/gates/{test_payment_gate.id}/check-readiness", json={})
        assert response.status_code == 200
        data = response.json()
        assert "can_release" in data
        assert "reasons" in data
    
    async def test_get_payment_summary(self, auth_client: AsyncClient, test_project: Project):
        """Test getting payment summary."""
        response = await auth_client.get(f"/api/payments/summary/project/{test_project.id}")
        assert response.status_code == 200
        data = response.json()
        assert "total_gates" in data
        assert "total_amount" in data


class TestEndToEnd:
    """End-to-end integration tests."""
    
    async def test_full_project_workflow(self, auth_client: AsyncClient):
        """Test complete project workflow from creation to payment."""
        # 1. Create project
        response = await auth_client.post("/api/projects/", json={
            "name": "E2E Test Project",
            "address": "E2E Street, Dubai",
            "location": "Dubai",
            "contract_value": 2000000.0
        })
        assert response.status_code == 200
        project = response.json()
        project_id = project["id"]
        
        # 2. Get stages (auto-generated)
        response = await auth_client.get(f"/api/stages/project/{project_id}")
        assert response.status_code == 200
        stages = response.json()["items"]
        assert len(stages) > 0
        
        # 3. Start first stage
        stage_id = stages[0]["id"]
        response = await auth_client.post(f"/api/stages/{stage_id}/start", json={"user_id": "test"})
        assert response.status_code == 200
        
        # 4. Update checklist
        response = await auth_client.patch(f"/api/stages/{stage_id}/checklist", json={
            "item_index": 0,
            "completed": True
        })
        assert response.status_code == 200
        
        # 5. Submit for approval
        response = await auth_client.post(f"/api/stages/{stage_id}/submit", json={})
        assert response.status_code == 200
        
        # 6. Approve stage
        response = await auth_client.post(f"/api/stages/{stage_id}/approve", json={"approved_by": "consultant"})
        assert response.status_code == 200
        
        # 7. Get payment gates
        response = await auth_client.get(f"/api/payments/gates/project/{project_id}")
        assert response.status_code == 200
        payments = response.json()["items"]
        
        if len(payments) > 0:
            payment_id = payments[0]["id"]
            
            # 8. Request payment release
            response = await auth_client.post(f"/api/payments/gates/{payment_id}/request-release", json={
                "requested_by": "owner"
            })
            # May fail if conditions not met, that's OK for this test
            
            # 9. Check payment readiness
            response = await auth_client.post(f"/api/payments/gates/{payment_id}/check-readiness", json={})
            assert response.status_code == 200
        
        # 10. Get project health
        response = await auth_client.get(f"/api/projects/{project_id}/health")
        assert response.status_code == 200
        
        # 11. Get project progress
        response = await auth_client.get(f"/api/projects/{project_id}/progress")
        assert response.status_code == 200
