from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Interview Coach backend is running"}


def test_signup_creates_user():
    response = client.post(
        "/signup",
        json={
            "name": "Test User",
            "email": "pytest_user_1@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "pytest_user_1@example.com"
    assert "password" not in data


def test_signup_duplicate_email_fails():
    client.post(
        "/signup",
        json={
            "name": "Duplicate User",
            "email": "pytest_duplicate@example.com",
            "password": "testpassword123",
        },
    )
    response = client.post(
        "/signup",
        json={
            "name": "Duplicate User Again",
            "email": "pytest_duplicate@example.com",
            "password": "anotherpassword",
        },
    )
    assert response.status_code == 400


def test_login_wrong_password_fails():
    client.post(
        "/signup",
        json={
            "name": "Login Test User",
            "email": "pytest_login@example.com",
            "password": "correctpassword",
        },
    )
    response = client.post(
        "/login",
        json={
            "email": "pytest_login@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401