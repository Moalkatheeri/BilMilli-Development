"""Tests for AI proxy endpoints."""
import pytest
from httpx import AsyncClient


class TestAIProxyRoutes:
    """Test AI proxy API endpoints."""
    
    async def test_ai_health_check(self, auth_client: AsyncClient):
        """Test AI health check endpoint."""
        response = await auth_client.get("/api/ai/health")
        # May be 200 (healthy) or return unhealthy status
        assert response.status_code in [200, 502, 503]
    
    async def test_analyze_photo_unauthorized(self, client: AsyncClient):
        """Test that photo analysis requires authentication."""
        response = await client.post("/api/ai/photos/analyze")
        assert response.status_code == 401
    
    async def test_analyze_floorplan_unauthorized(self, client: AsyncClient):
        """Test that floorplan analysis requires authentication."""
        response = await client.post("/api/ai/floorplan/analyze")
        assert response.status_code == 401
    
    async def test_convert_floorplan_to_3d_unauthorized(self, client: AsyncClient):
        """Test that 3D conversion requires authentication."""
        response = await client.post("/api/ai/floorplan/convert-to-3d")
        assert response.status_code == 401
    
    async def test_get_model_status_unauthorized(self, client: AsyncClient):
        """Test that getting model status requires authentication."""
        response = await client.get("/api/ai/models/test-id/status")
        assert response.status_code == 401
    
    async def test_generate_model_from_text_unauthorized(self, client: AsyncClient):
        """Test that model generation requires authentication."""
        response = await client.post("/api/ai/models/generate-from-text", json={
            "description": "A modern villa with 4 bedrooms"
        })
        assert response.status_code == 401
    
    async def test_generate_model_from_text_authorized(self, auth_client: AsyncClient):
        """Test model generation from text when authenticated."""
        response = await auth_client.post("/api/ai/models/generate-from-text", json={
            "description": "A modern villa with 4 bedrooms"
        })
        # May fail if pro-backend is not available, but should not be 401
        assert response.status_code != 401
    
    async def test_get_model_status_authorized(self, auth_client: AsyncClient):
        """Test getting model status when authenticated."""
        response = await auth_client.get("/api/ai/models/test-model-id/status")
        # May fail if pro-backend is not available, but should not be 401
        assert response.status_code != 401
