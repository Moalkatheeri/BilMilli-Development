import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


async def create_project_with_stages(client: AsyncClient, auth_headers: dict) -> str:
    """Helper: create a project (which auto-generates stages).

    start_date and expected_completion are required so that
    StageManager.create_stages_for_project can compute planned dates.
    """
    now = datetime.utcnow()
    resp = await client.post("/api/projects/", json={
        "name": "Stage Test Villa",
        "address": "Test St",
        "location": "Dubai",
        "contract_value": 3000000,
        "start_date": now.isoformat(),
        "expected_completion": (now + timedelta(days=365)).isoformat(),
    }, headers=auth_headers)
    assert resp.status_code == 200, f"Project creation failed: {resp.text}"
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_list_stages(client: AsyncClient, auth_headers: dict):
    project_id = await create_project_with_stages(client, auth_headers)
    response = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    assert response.status_code == 200
    stages = response.json()
    assert len(stages) == 12  # 12 UAE villa construction stages


@pytest.mark.asyncio
async def test_start_first_stage(client: AsyncClient, auth_headers: dict):
    project_id = await create_project_with_stages(client, auth_headers)
    stages_resp = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    first_stage_id = stages_resp.json()[0]["id"]

    response = await client.post(f"/api/stages/{first_stage_id}/start", json={
        "user_id": "test-user",
    }, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True


@pytest.mark.asyncio
async def test_stage_lifecycle(client: AsyncClient, auth_headers: dict):
    project_id = await create_project_with_stages(client, auth_headers)
    stages_resp = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    first_stage = stages_resp.json()[0]
    first_stage_id = first_stage["id"]

    # Start
    resp = await client.post(f"/api/stages/{first_stage_id}/start", json={
        "user_id": "test-user",
    }, headers=auth_headers)
    assert resp.status_code == 200

    # Complete all checklist items before submitting for approval.
    # The stage_manager.submit_for_approval rejects if any items are incomplete.
    num_items = len(first_stage["checklist_items"])
    for idx in range(num_items):
        resp = await client.patch(f"/api/stages/{first_stage_id}/checklist", json={
            "item_index": idx,
            "completed": True,
        }, headers=auth_headers)
        assert resp.status_code == 200

    # Submit for approval
    resp = await client.post(f"/api/stages/{first_stage_id}/submit", json={}, headers=auth_headers)
    assert resp.status_code == 200

    # Approve
    resp = await client.post(f"/api/stages/{first_stage_id}/approve", json={
        "approved_by": "test-approver",
    }, headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cannot_start_second_stage_before_first(client: AsyncClient, auth_headers: dict):
    project_id = await create_project_with_stages(client, auth_headers)
    stages_resp = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    second_stage_id = stages_resp.json()[1]["id"]

    # Try to start second stage without completing first
    response = await client.post(f"/api/stages/{second_stage_id}/start", json={
        "user_id": "test-user",
    }, headers=auth_headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_checklist(client: AsyncClient, auth_headers: dict):
    project_id = await create_project_with_stages(client, auth_headers)
    stages_resp = await client.get(f"/api/stages/project/{project_id}", headers=auth_headers)
    first_stage_id = stages_resp.json()[0]["id"]

    # Start first
    await client.post(f"/api/stages/{first_stage_id}/start", json={
        "user_id": "test-user",
    }, headers=auth_headers)

    # Update checklist item
    response = await client.patch(f"/api/stages/{first_stage_id}/checklist", json={
        "item_index": 0,
        "completed": True,
    }, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
