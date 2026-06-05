import pytest
from httpx import AsyncClient
from backend.main import app
from backend.database import engine, Base

@pytest.fixture(scope="session")
async def async_client():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
