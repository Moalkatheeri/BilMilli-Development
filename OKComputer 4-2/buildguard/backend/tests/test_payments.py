import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_create_payment_gate(client: AsyncClient, auth_headers: dict):
    # Create project first
    now = datetime.utcnow()
    proj = await client.post("/api/projects/", json={
        "name": "Pay Test Villa",
        "address": "Pay St",
        "location": "Dubai",
        "contract_value": 5000000,
        "start_date": now.isoformat(),
        "expected_completion": (now + timedelta(days=365)).isoformat(),
    }, headers=auth_headers)
    project_id = proj.json()["id"]

    stages = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    stage_id = stages.json()[0]["id"]

    response = await client.post("/api/payments/gates", json={
        "project_id": project_id,
        "stage_id": stage_id,
        "amount": 100000,
        "description": "First payment milestone",
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 100000


@pytest.mark.asyncio
async def test_list_payment_gates(client: AsyncClient, auth_headers: dict):
    now = datetime.utcnow()
    proj = await client.post("/api/projects/", json={
        "name": "List Pay Villa",
        "address": "Pay St",
        "location": "Dubai",
        "start_date": now.isoformat(),
        "expected_completion": (now + timedelta(days=365)).isoformat(),
    }, headers=auth_headers)
    project_id = proj.json()["id"]

    response = await client.get(f"/api/payments/gates/project/{project_id}", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
