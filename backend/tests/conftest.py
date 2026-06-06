import pytest
from httpx import AsyncClient
from backend.main import app
from backend.database import engine, Base

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def async_client():
    # Reset and recreate all tables for a clean test run
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
        
    # Drop all tables synchronously
    Base.metadata.drop_all(bind=engine)

