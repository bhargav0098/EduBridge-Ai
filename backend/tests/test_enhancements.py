import pytest
from httpx import AsyncClient
import hashlib

@pytest.mark.anyio
async def test_wiki_search_and_upvotes_flow(async_client: AsyncClient):
    # 1. Register a student
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "wiki_student@edubridge.com",
            "name": "Wiki Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload a new note to the wiki
    # We will upload via multipart form-data or JSON (since notes.py supports form data)
    note_data = {
        "title": "Quantum Mechanics Matrix Guide",
        "content": "A detailed explanation of matrices in quantum state space calculations.",
        "tags": "quantum,matrices,physics",
    }
    
    upload_res = await async_client.post(
        "/api/notes/upload",
        data=note_data,
        headers=headers
    )
    assert upload_res.status_code == 200
    note = upload_res.json()
    assert note["title"] == "Quantum Mechanics Matrix Guide"
    note_id = note["id"]

    # 3. Toggle upvote first time -> Upvoted: True, count goes to 1
    upvote_res1 = await async_client.post(f"/api/notes/{note_id}/upvote", headers=headers)
    assert upvote_res1.status_code == 200
    upvote_data1 = upvote_res1.json()
    assert upvote_data1["upvoted"] is True
    assert upvote_data1["change"] == 1

    # 4. Search wiki and verify upvote count is reflected
    search_res = await async_client.get(
        "/api/notes/wiki/search?search=Matrix",
        headers=headers
    )
    assert search_res.status_code == 200
    wiki_notes = search_res.json()
    assert len(wiki_notes) > 0
    assert wiki_notes[0]["id"] == note_id
    assert wiki_notes[0]["upvotes_count"] == 1

    # 5. Toggle upvote second time -> Upvoted: False, count goes back to 0
    upvote_res2 = await async_client.post(f"/api/notes/{note_id}/upvote", headers=headers)
    assert upvote_res2.status_code == 200
    upvote_data2 = upvote_res2.json()
    assert upvote_data2["upvoted"] is False
    assert upvote_data2["change"] == -1


@pytest.mark.anyio
async def test_adaptive_scheduler_pathway(async_client: AsyncClient):
    # Register/login
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "pathway_student@edubridge.com",
            "name": "Pathway Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query pathway
    res = await async_client.get(
        "/api/quiz/pathway?subject=physics",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["subject"] == "physics"
    assert "pathway" in data
    assert len(data["pathway"]) > 0
    # Checks schema
    first_item = data["pathway"][0]
    assert "topic" in first_item
    assert "accuracy" in first_item
    assert "attempts" in first_item
    assert "next_lesson" in first_item
    assert "status" in first_item


@pytest.mark.anyio
async def test_adaptive_streak_and_micro_lesson(async_client: AsyncClient):
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "streak_student@edubridge.com",
            "name": "Streak Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get next physics question
    next_res = await async_client.get("/api/quiz/next?subject=physics", headers=headers)
    assert next_res.status_code == 200
    q_data = next_res.json()
    q_id = q_data["id"]

    # 2. Submit wrong answer twice to trigger micro-lesson
    # We submit a completely wrong answer value 'totally_incorrect_answer'
    ans_res1 = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=totally_incorrect_answer",
        headers=headers
    )
    assert ans_res1.status_code == 200
    ans_data1 = ans_res1.json()
    assert ans_data1["correct"] is False

    ans_res2 = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=totally_incorrect_answer",
        headers=headers
    )
    assert ans_res2.status_code == 200
    ans_data2 = ans_res2.json()
    assert ans_data2["correct"] is False
    # Verify a micro lesson is returned!
    assert ans_data2["triggered_micro_lesson"] is not None


@pytest.mark.anyio
async def test_achievement_badge_hash_verification(async_client: AsyncClient):
    # Register student
    register_response = await async_client.post(
        "/api/auth/register",
        json={
            "email": "badge_student@edubridge.com",
            "name": "Badge Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Let's get student stats / achievements. Since it's a new student, achievements is empty
    stats_res = await async_client.get("/api/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert len(stats_data["achievements"]) == 0

    # Let's trigger a badge by submitting a correct answer three times.
    # To do that, we get a question, submit its exact correct answer.
    # But wait, how do we know the correct answer? We can get it from database or query it,
    # or we can do it directly. In test_backend.py, we saw:
    # "Option A <q_id>" is not necessarily the correct answer, but let's query the question
    # from the next question info, or we can check the returned 'correct_answer' from a failed attempt!
    # Yes! The response to a failed attempt returns the "correct_answer" field!
    next_res = await async_client.get("/api/quiz/next?subject=physics", headers=headers)
    assert next_res.status_code == 200
    q_data = next_res.json()
    q_id = q_data["id"]

    # Attempt with wrong answer to retrieve correct answer
    wrong_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=wrong_ans",
        headers=headers
    )
    assert wrong_res.status_code == 200
    correct_ans = wrong_res.json()["correct_answer"]

    # Now, answer correctly three times in a row!
    for _ in range(3):
      ok_res = await async_client.post(
          f"/api/quiz/answer?question_id={q_id}&student_answer={correct_ans}",
          headers=headers
      )
      assert ok_res.status_code == 200
      assert ok_res.json()["correct"] is True

    # Check achievements list now! It should contain the "Quiz Streak Master" achievement
    stats_res2 = await async_client.get("/api/dashboard/stats", headers=headers)
    assert stats_res2.status_code == 200
    achievements = stats_res2.json()["achievements"]
    assert len(achievements) > 0
    
    streak_badge = next(a for a in achievements if a["badge_name"] == "Quiz Streak Master")
    assert streak_badge["badge_hash"] is not None
    assert len(streak_badge["badge_hash"]) == 64 # SHA-256 length is 64 hex characters


@pytest.mark.anyio
async def test_semantic_grading_misconceptions(async_client: AsyncClient):
    # 1. Register a teacher
    teacher_res = await async_client.post(
        "/api/auth/register",
        json={
            "email": "teacher_eval@edubridge.com",
            "name": "Teacher Evaluator",
            "password": "securepassword123",
            "role": "teacher"
        }
    )
    assert teacher_res.status_code == 201
    teacher_token = teacher_res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # 2. Post a custom SHORT answer question with misconception triggers
    q_res = await async_client.post(
        "/api/quiz/questions",
        json={
            "id": 9999,
            "subject": "physics",
            "topic": "Modern Physics",
            "question_text": "Explain photosynthesis and where it takes place.",
            "difficulty": 3,
            "type": "SHORT",
            "options": [],
            "answer": "photosynthesis occurs in chloroplasts of green plants to make food",
            "explanation": "Photosynthesis uses sunlight to produce nutrients in chloroplasts."
        },
        headers=teacher_headers
    )
    assert q_res.status_code == 200
    q_id = q_res.json()["question_id"]

    # 3. Register a student
    student_res = await async_client.post(
        "/api/auth/register",
        json={
            "email": "short_student@edubridge.com",
            "name": "Short Answer Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    assert student_res.status_code == 201
    student_token = student_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 4. Answer with a misconception (mitochondria instead of chloroplasts)
    wrong_ans_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=Photosynthesis occurs in mitochondria to make food",
        headers=student_headers
    )
    assert wrong_ans_res.status_code == 200
    wrong_data = wrong_ans_res.json()
    assert wrong_data["correct"] is False
    assert "mitochondria" in wrong_data["misconception_detected"].lower()

    # 5. Answer with correct semantic content
    correct_ans_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=Plants make food in chloroplasts using sunlight",
        headers=student_headers
    )
    assert correct_ans_res.status_code == 200
    correct_data = correct_ans_res.json()
    assert correct_data["correct"] is True


@pytest.mark.anyio
async def test_bkt_mastery_and_spaced_repetition(async_client: AsyncClient):
    # 1. Register a student
    student_res = await async_client.post(
        "/api/auth/register",
        json={
            "email": "bkt_student@edubridge.com",
            "name": "BKT Tester",
            "password": "securepassword123",
            "role": "student"
        }
    )
    assert student_res.status_code == 201
    student_token = student_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 2. Retrieve initial pathway for subject physics and get the first topic
    pathway_res = await async_client.get("/api/quiz/pathway?subject=physics", headers=student_headers)
    assert pathway_res.status_code == 200
    pathway_data = pathway_res.json()["pathway"]
    assert len(pathway_data) > 0
    first_topic = pathway_data[0]["topic"]
    initial_p_known = pathway_data[0]["p_known"]
    assert initial_p_known == 0.25 # Default BKT value

    # 3. Get next question on this topic
    next_res = await async_client.get(f"/api/quiz/next?subject=physics&topic={first_topic}", headers=student_headers)
    assert next_res.status_code == 200
    q_id = next_res.json()["id"]

    # 4. Attempt with wrong answer to retrieve correct answer
    wrong_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer=wrong",
        headers=student_headers
    )
    assert wrong_res.status_code == 200
    correct_ans = wrong_res.json()["correct_answer"]

    # 5. Submit correct answer to trigger BKT update
    ok_res = await async_client.post(
        f"/api/quiz/answer?question_id={q_id}&student_answer={correct_ans}",
        headers=student_headers
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["correct"] is True
    updated_p_known = ok_res.json()["p_known"]
    assert updated_p_known > initial_p_known

    # 6. Verify pathway endpoint reports the updated p_known and retention
    pathway_res2 = await async_client.get("/api/quiz/pathway?subject=physics", headers=student_headers)
    assert pathway_res2.status_code == 200
    pathway_item = next(p for p in pathway_res2.json()["pathway"] if p["topic"] == first_topic)
    assert pathway_item["p_known"] == round(updated_p_known, 3)
    assert pathway_item["retention"] > 0
    assert pathway_item["review_recommended"] is False # Just practiced, so retention is 100%

    # 7. Check the concept-graph endpoint overlays the mastery properly
    graph_res = await async_client.get("/api/quiz/concept-graph", headers=student_headers)
    assert graph_res.status_code == 200
    node = next(n for n in graph_res.json()["nodes"] if n["id"].lower().strip() == first_topic.lower().strip())
    assert node["mastery"] == round(updated_p_known * 100, 1)
