"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.auth import verify_password


class TestAuth:
    """Test authentication functionality."""
    
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "full_name": "New User",
            "role": "owner"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["full_name"] == "New User"
    
    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate email."""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",  # Same as test_user
            "password": "password123",
            "full_name": "Another User",
            "role": "owner"
        })
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login."""
        response = await client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"
    
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password."""
        response = await client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        response = await client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 401
    
    async def test_me_authenticated(self, auth_client: AsyncClient, test_user: User):
        """Test getting current user when authenticated."""
        response = await auth_client.get("/api/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
    
    async def test_me_unauthenticated(self, client: AsyncClient):
        """Test getting current user when not authenticated."""
        response = await client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    async def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "testpassword123"
        hashed = "mock_hash"  # Would be actual hash from hash_password
        
        # This tests that the hash_password function works
        from app.core.auth import hash_password, verify_password
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False
