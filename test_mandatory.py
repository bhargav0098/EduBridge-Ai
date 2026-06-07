import requests
import random
import string
import time

BASE_URL = "http://localhost:3000/api"

def get_random_email():
    return f"testuser_{''.join(random.choices(string.ascii_lowercase, k=6))}@test.com"

def run_tests():
    print("=========================================")
    print("MANDATORY TEST: STUDENT WORKFLOW")
    print("=========================================")
    
    student_email = get_random_email()
    password = "password123"
    
    print(f"[1] Registering NEW student {student_email}...")
    res = requests.post(f"{BASE_URL}/register", json={
        "email": student_email,
        "password": password,
        "name": "E2E Student",
        "role": "student"
    })
    
    if res.status_code not in [200, 201]:
        print(f"FAILED: {res.text}")
        return
        
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[1] SUCCESS")

    print(f"[2] Enrolling in CS-3A...")
    res = requests.post(f"{BASE_URL}/attendance/student/profile", json={
        "class_name": "CS-3A"
    }, headers=student_headers)
    
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print(f"[2] SUCCESS: {res.text}")
    
    print("[3] Refresh Page (Fetch Profile)...")
    res = requests.get(f"{BASE_URL}/attendance/student/profile", headers=student_headers)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print(f"[3] SUCCESS: {res.text}")
    assert "CS-3A" in res.json().get("class_name", ""), "Enrollment did not persist!"

    print("[4] Open Quiz Arena (Verify unlocked)...")
    res = requests.get(f"{BASE_URL}/attendance/student/profile", headers=student_headers)
    data = res.json()
    if not data or not data.get("class_name"):
        print("FAILED: Quiz Arena is locked (Not Enrolled)")
        return
    print(f"[4] SUCCESS: Quiz Arena Unlocked! Found class_name: {data.get('class_name')}")

    print("[5] Logout (Clear token)...")
    student_headers = {}
    print("[5] SUCCESS")
    
    print("[6] Login Again...")
    res = requests.post(f"{BASE_URL}/login", json={
        "email": student_email,
        "password": password
    })
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[6] SUCCESS: Logged in again successfully")
    
    print("[7] Refresh Browser (Verify Session)...")
    res = requests.get(f"{BASE_URL}/me", headers=student_headers)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print("[7] SUCCESS: Fetched /me successfully after re-login")

    print("[8] AI Chat (Ask what is Python?)...")
    res = requests.post(f"{BASE_URL}/chat", json={
        "message": "What is Python?",
        "language": "English"
    }, headers=student_headers)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print(f"[8] SUCCESS: Gemini responded with: {res.json().get('reply', res.json().get('response', ''))[:50]}...")


    print("\n=========================================")
    print("MANDATORY TEST: TEACHER WORKFLOW")
    print("=========================================")
    
    teacher_email = get_random_email()
    
    print(f"[1] Registering NEW teacher {teacher_email}...")
    res = requests.post(f"{BASE_URL}/register", json={
        "email": teacher_email,
        "password": password,
        "name": "E2E Teacher",
        "role": "teacher"
    })
    
    if res.status_code not in [200, 201]:
        print(f"FAILED: {res.text}")
        return
        
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    teacher_id = res.json()["user"]["id"]
    print("[1] SUCCESS")

    print("[2] Create Assignment...")
    res = requests.post(f"{BASE_URL}/assignments/", json={
        "title": "E2E Homework",
        "description": "Complete chapters 1 and 2.",
        "due_date": "2026-12-31T23:59:00",
        "class_id": "c1", # Assuming c1 exists (CS-3A)
        "questions": [{"text": "What is 1+1?", "options": ["1", "2"], "correct_answer": "2"}]
    }, headers=teacher_headers)
    
    if res.status_code not in [200, 201]:
        print(f"FAILED: {res.text}")
        return
    print(f"[2] SUCCESS: Assignment created")

    print("[3] Mark Attendance...")
    res = requests.post(f"{BASE_URL}/attendance/mark", json={
        "classId": "c1",
        "attendance": [
            {"studentId": student_email, "status": "Present"} # using email as mock ID if needed
        ]
    }, headers=teacher_headers)
    
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print(f"[3] SUCCESS: Attendance marked")

    print("[4] Refresh Page (Data Persistence)...")
    res = requests.get(f"{BASE_URL}/attendance/classes", headers=teacher_headers)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    print("[4] SUCCESS: Fetched classes data")
    
    print("\nALL MANDATORY TESTS PASSED SUCCESSFULLLY!")

if __name__ == "__main__":
    run_tests()
