"""Test configuration and fixtures for BuildGuard Pro."""
import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import delete
from httpx import AsyncClient

from app.main import app
from app.core.database import get_db, Base
from app.core.auth import hash_password, create_access_token
from app.models.user import User
from app.models.project import Project, ConstructionStage, StageStatus
from app.models.deviation import DeviationEvent, DeviationSeverity, DeviationStatus
from app.models.payment import PaymentGate, PaymentStatus

# Test database URL (SQLite in-memory for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before running tests."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with TestingSessionLocal() as session:
        yield session
        # Clean up after test
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        password_hash=hash_password("testpassword123"),
        full_name="Test User",
        role="owner",
        project_ids=[]
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture
async def auth_token(test_user: User) -> str:
    """Create an auth token for the test user."""
    return create_access_token(test_user.id, test_user.role)


@pytest.fixture
async def auth_client(client: AsyncClient, auth_token: str) -> AsyncClient:
    """Create an authenticated test client."""
    client.headers["Authorization"] = f"Bearer {auth_token}"
    return client


@pytest.fixture
async def test_project(db_session: AsyncSession, test_user: User) -> Project:
    """Create a test project."""
    project = Project(
        name="Test Villa Project",
        address="123 Test Street, Abu Dhabi",
        location="Abu Dhabi",
        contract_value=2000000.0,
        status="active",
        progress=0.0
    )
    db_session.add(project)
    await db_session.flush()
    
    # Update user's project_ids
    test_user.project_ids = [project.id]
    await db_session.flush()
    
    return project


@pytest.fixture
async def test_stages(db_session: AsyncSession, test_project: Project) -> list:
    """Create test stages for a project."""
    stages = []
    stage_data = [
        {"name": "Foundation", "sequence": 1, "phase": "foundation", "payment_percentage": 15},
        {"name": "Structure", "sequence": 2, "phase": "structure", "payment_percentage": 25},
        {"name": "MEP", "sequence": 3, "phase": "mep", "payment_percentage": 20},
        {"name": "Finishes", "sequence": 4, "phase": "finishes", "payment_percentage": 25},
        {"name": "Handover", "sequence": 5, "phase": "handover", "payment_percentage": 15},
    ]
    
    for data in stage_data:
        stage = ConstructionStage(
            project_id=test_project.id,
            name=data["name"],
            sequence=data["sequence"],
            phase=data["phase"],
            status=StageStatus.NOT_STARTED,
            payment_percentage=data["payment_percentage"],
            payment_amount=test_project.contract_value * data["payment_percentage"] / 100,
            checklist_items=[
                {"id": f"check_{i}", "item": f"Checklist item {i}", "completed": False}
                for i in range(3)
            ]
        )
        db_session.add(stage)
        stages.append(stage)
    
    await db_session.flush()
    return stages


@pytest.fixture
async def test_payment_gate(db_session: AsyncSession, test_project: Project, test_stages: list) -> PaymentGate:
    """Create a test payment gate."""
    payment = PaymentGate(
        project_id=test_project.id,
        stage_id=test_stages[0].id,
        amount=test_stages[0].payment_amount,
        currency="AED",
        description=f"Payment for {test_stages[0].name}",
        status=PaymentStatus.PENDING
    )
    db_session.add(payment)
    await db_session.flush()
    return payment


@pytest.fixture
async def test_deviation(db_session: AsyncSession, test_project: Project) -> DeviationEvent:
    """Create a test deviation."""
    deviation = DeviationEvent(
        project_id=test_project.id,
        element_type="wall",
        element_id="wall_001",
        element_name="Living Room Wall",
        deviation_type="position",
        severity=DeviationSeverity.MAJOR,
        status=DeviationStatus.DETECTED,
        position_deviation_mm=45.0,
        tolerance_mm=20.0,
        description="Wall is 45mm off from planned position",
        detected_by="system"
    )
    db_session.add(deviation)
    await db_session.flush()
    return deviation
