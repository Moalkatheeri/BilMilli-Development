import os

# We MUST set SECRET_KEY env var before importing any app modules,
# because app.core.config.Settings() is evaluated at import time and
# requires SECRET_KEY to be present.
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.auth import create_access_token, hash_password
from app.models.user import User, UserRole
from app.main import app

# Use SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_headers():
    """Create a test user and return auth headers."""
    async with TestSessionLocal() as session:
        user = User(
            email="test@example.com",
            password_hash=hash_password("testpass123"),
            full_name="Test User",
            role=UserRole.ADMIN,
            project_ids=[],
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        token = create_access_token(user.id, user.role.value)
        return {"Authorization": f"Bearer {token}"}
