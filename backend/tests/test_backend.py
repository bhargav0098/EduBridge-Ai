import pytest
from httpx import AsyncClient

@pytest.mark.anyio
async def test_auth_and_user_flow(async_client: AsyncClient):
    # 1. Register a student
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "student@edubridge.com",
            "name": "Ankesh Srivastava",
            "password": "securepassword123",
            "role": "student"
        }
    )
    assert register_response.status_code == 201
    token_data = register_response.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login the student
    login_response = await async_client.post(
        "/api/auth/login",
        json={
            "email": "student@edubridge.com",
            "password": "securepassword123"
        }
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()

    # 3. Access protected route /auth/me
    me_response = await async_client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["email"] == "student@edubridge.com"
    assert user_data["name"] == "Ankesh Srivastava"
    assert user_data["role"] == "student"


@pytest.mark.anyio
async def test_ai_chat_flow(async_client: AsyncClient):
    # Register/login user
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "tutor@edubridge.com",
            "name": "Tutor Student",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # POST to chat endpoint with stream=False
    chat_response = await async_client.post(
        "/api/chat?stream=false",
        json={
            "message": "Explain Newton's second law of motion.",
            "language": "English"
        },
        headers=headers
    )
    assert chat_response.status_code == 200
    res_data = chat_response.json()
    assert "answer" in res_data
    assert "sources" in res_data
    assert "session_id" in res_data
    assert len(res_data["sources"]) > 0


@pytest.mark.anyio
async def test_speech_to_text(async_client: AsyncClient):
    # Register/login user
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "speech@edubridge.com",
            "name": "Speech User",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock audio file upload
    files = {"file": ("test_audio.wav", b"fake audio content", "audio/wav")}
    data = {"language": "English", "chain_to_chat": "false"}
    
    response = await async_client.post(
        "/api/speech",
        files=files,
        data=data,
        headers=headers
    )
    assert response.status_code == 200
    res_json = response.json()
    assert "transcript" in res_json
    assert "detected_language" in res_json


@pytest.mark.anyio
async def test_donut_ocr_solver(async_client: AsyncClient):
    # Register/login user
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "ocr@edubridge.com",
            "name": "OCR User",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Math problem image upload
    files = {"file": ("math_problem.png", b"fake image content", "image/png")}
    response = await async_client.post(
        "/api/ocr",
        files=files,
        headers=headers
    )
    assert response.status_code == 200
    res_json = response.json()
    assert "extracted_text" in res_json
    assert "solution" in res_json
    assert "steps" in res_json
    assert isinstance(res_json["steps"], list)


@pytest.mark.anyio
async def test_adaptive_quiz_flow(async_client: AsyncClient):
    # Register/login user
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "quiz_student@edubridge.com",
            "name": "Quiz Student",
            "password": "securepassword123",
            "role": "student"
        }
    )
    user_id = register_response.json().get("user_id") # Register endpoint returns token, let's get profile to get user id
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get student user ID by calling /me
    me_res = await async_client.get("/api/auth/me", headers=headers)
    student_id = me_res.json()["id"]

    # 1. Get next physics question
    next_res = await async_client.get("/api/quiz/next?subject=physics", headers=headers)
    assert next_res.status_code == 200
    q_data = next_res.json()
    assert "id" in q_data
    assert "difficulty" in q_data
    assert q_data["subject"] == "physics"

    q_id = q_data["id"]

    # 2. Submit correct answer (let's check ELO increment)
    # The seeded correct answer is 'Option A <q_id>' or 'E = mc^2' or similar. We can pass anything, it returns ELO adjustment.
    ans_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=Option%20A%20{q_id}",
        headers=headers
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert "correct" in ans_data
    assert "new_elo" in ans_data
    assert "old_elo" in ans_data

    # 3. Get topic analytics
    analytics_res = await async_client.get(f"/api/quiz/analytics/{student_id}", headers=headers)
    assert analytics_res.status_code == 200
    analy_data = analytics_res.json()
    assert analy_data["student_id"] == student_id
    assert "topics" in analy_data
    assert analy_data["total_attempts"] > 0
