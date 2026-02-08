"""Client for communicating with the BuildGuard Pro Backend (AI/3D processing service)."""
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

PRO_BACKEND_URL = "http://pro-backend:8000/api/v1"


class ProBackendClient:
    """Client for the AI/3D processing backend."""
    
    def __init__(self, base_url: str = PRO_BACKEND_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def analyze_photo(self, photo_url: str, project_id: Optional[str] = None, stage_id: Optional[str] = None) -> Dict[str, Any]:
        """Send a photo to the pro-backend for AI analysis."""
        try:
            response = await self.client.post(
                f"{self.base_url}/photos/analyze",
                data={
                    "project_id": project_id or "",
                    "stage_id": stage_id or ""
                },
                files={"file": ("photo.jpg", await self._download_image(photo_url), "image/jpeg")}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to analyze photo: {str(e)}"}
    
    async def process_model(self, model_url: str, project_id: str) -> Dict[str, Any]:
        """Send a 3D model to the pro-backend for processing."""
        try:
            response = await self.client.post(
                f"{self.base_url}/models/upload",
                data={"project_id": project_id},
                files={"file": ("model.ifc", await self._download_file(model_url), "application/octet-stream")}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to process model: {str(e)}"}
    
    async def generate_model_from_text(self, description: str) -> Dict[str, Any]:
        """Generate a 3D model from text description."""
        try:
            response = await self.client.post(
                f"{self.base_url}/models/generate-from-text",
                json={"description": description}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to generate model: {str(e)}"}
    
    async def get_model_status(self, model_id: str) -> Dict[str, Any]:
        """Get the processing status of a 3D model."""
        try:
            response = await self.client.get(f"{self.base_url}/models/{model_id}/status")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to get model status: {str(e)}"}
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if the pro-backend is healthy."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def _download_image(self, url: str) -> bytes:
        """Download an image from a URL."""
        # For pre-signed MinIO URLs, just fetch directly
        response = await self.client.get(url)
        response.raise_for_status()
        return response.content
    
    async def _download_file(self, url: str) -> bytes:
        """Download a file from a URL."""
        response = await self.client.get(url)
        response.raise_for_status()
        return response.content
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Singleton instance
_pro_backend_client: Optional[ProBackendClient] = None


def get_pro_backend_client() -> ProBackendClient:
    """Get or create the pro-backend client singleton."""
    global _pro_backend_client
    if _pro_backend_client is None:
        _pro_backend_client = ProBackendClient()
    return _pro_backend_client
