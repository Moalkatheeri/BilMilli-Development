"""Tests for evidence package endpoints."""
import pytest
from httpx import AsyncClient


class TestEvidenceRoutes:
    """Test evidence package API endpoints."""
    
    async def test_generate_evidence_package_unauthorized(self, client: AsyncClient, test_project):
        """Test that generating evidence package requires authentication."""
        response = await client.post(f"/api/evidence/project/{test_project.id}/generate")
        assert response.status_code == 401
    
    async def test_generate_evidence_package_authorized(self, auth_client: AsyncClient, test_project):
        """Test generating evidence package when authenticated."""
        response = await auth_client.post(f"/api/evidence/project/{test_project.id}/generate")
        assert response.status_code == 200
        data = response.json()
        assert "package_id" in data
        assert "project_id" in data
        assert "generated_at" in data
        assert "summary" in data
        assert "total_stages" in data["summary"]
    
    async def test_download_evidence_package(self, auth_client: AsyncClient, test_project):
        """Test downloading an evidence package."""
        # First generate a package
        response = await auth_client.post(f"/api/evidence/project/{test_project.id}/generate")
        assert response.status_code == 200
        package_id = response.json()["package_id"]
        
        # Download the package
        response = await auth_client.get(f"/api/evidence/{package_id}/download")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
    
    async def test_share_with_teyaseer(self, auth_client: AsyncClient, test_project):
        """Test sharing project with Teyaseer."""
        response = await auth_client.post(f"/api/evidence/project/{test_project.id}/share-teyaseer")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "teyaseer_reference" in data
        assert "package_id" in data
        assert data["teyaseer_reference"].startswith("TEY-")
    
    async def test_list_evidence_packages(self, auth_client: AsyncClient, test_project):
        """Test listing evidence packages for a project."""
        # Generate a package first
        await auth_client.post(f"/api/evidence/project/{test_project.id}/generate")
        
        # List packages
        response = await auth_client.get(f"/api/evidence/project/{test_project.id}/packages")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
    
    async def test_list_evidence_packages_unauthorized(self, client: AsyncClient, test_project):
        """Test that listing evidence packages requires authentication."""
        response = await client.get(f"/api/evidence/project/{test_project.id}/packages")
        assert response.status_code == 401
    
    async def test_download_nonexistent_package(self, auth_client: AsyncClient):
        """Test downloading a non-existent package."""
        response = await auth_client.get("/api/evidence/nonexistent-id/download")
        assert response.status_code == 404
