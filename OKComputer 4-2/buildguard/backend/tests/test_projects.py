import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers: dict):
    response = await client.post("/api/projects/", json={
        "name": "Test Villa",
        "address": "123 Test St",
        "location": "Dubai",
        "contract_value": 5000000,
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Villa"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers: dict):
    # Create a project first
    await client.post("/api/projects/", json={
        "name": "Villa A",
        "address": "A St",
        "location": "Dubai",
    }, headers=auth_headers)

    response = await client.get("/api/projects/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/projects/", json={
        "name": "Villa B",
        "address": "B St",
        "location": "Abu Dhabi",
    }, headers=auth_headers)
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Villa B"


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/projects/", json={
        "name": "Villa C",
        "address": "C St",
        "location": "Sharjah",
    }, headers=auth_headers)
    project_id = create_resp.json()["id"]

    response = await client.patch(f"/api/projects/{project_id}", json={
        "name": "Villa C Updated",
    }, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Villa C Updated"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/projects/", json={
        "name": "Villa D",
        "address": "D St",
        "location": "Al Ain",
    }, headers=auth_headers)
    project_id = create_resp.json()["id"]

    response = await client.delete(f"/api/projects/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/projects/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404
