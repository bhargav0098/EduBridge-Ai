import requests
import time
import random
import string

BASE_URL = "http://localhost:8000/api"

def get_random_email():
    return f"testuser_{''.join(random.choices(string.ascii_lowercase, k=6))}@test.com"

def run_tests():
    print("Running E2E tests...")
    
    # 1. Register & Login Student
    student_email = get_random_email()
    password = "password123"
    
    print(f"Registering student {student_email}...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": student_email,
        "password": password,
        "name": "E2E Student",
        "role": "student"
    })
    
    assert res.status_code in [200, 201], f"Registration failed: {res.text}"
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 2. Register & Login Teacher
    teacher_email = get_random_email()
    print(f"Registering teacher {teacher_email}...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": teacher_email,
        "password": password,
        "name": "E2E Teacher",
        "role": "teacher"
    })
    assert res.status_code in [200, 201], f"Registration failed: {res.text}"
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # 3. Test Student Profile Setup (Enrollment)
    print("Testing student enrollment...")
    res = requests.post(f"{BASE_URL}/attendance/student/profile", json={
        "class_name": "CS-3A"
    }, headers=student_headers)
    assert res.status_code == 200, f"Enrollment failed: {res.text}"
    
    # 4. Test Teacher getting classes
    print("Testing teacher fetching classes...")
    res = requests.get(f"{BASE_URL}/attendance/classes", headers=teacher_headers)
    assert res.status_code == 200, f"Get classes failed: {res.text}"
    classes = res.json()
    assert len(classes) > 0, "No classes found"
    
    # 5. Teacher Assignment Creation
    print("Testing teacher creating assignment for CS-3A (id=c1)...")
    res = requests.post(f"{BASE_URL}/assignments/", json={
        "title": "E2E Test Assignment",
        "description": "Complete E2E checks.",
        "due_date": "2026-12-31T23:59:59Z",
        "class_id": "c1"
    }, headers=teacher_headers)
    assert res.status_code == 201, f"Assignment creation failed: {res.text}"
    assignment_id = res.json()["id"]
    
    # 6. Student views assignments
    print("Testing student fetching assignments...")
    res = requests.get(f"{BASE_URL}/assignments/student", headers=student_headers)
    assert res.status_code == 200, f"Student get assignments failed: {res.text}"
    student_assignments = res.json()
    assert len(student_assignments) > 0, "Student has no assignments"
    
    # 7. Student submits assignment
    submission_id = student_assignments[0]["id"]
    print(f"Testing student submitting assignment {submission_id}...")
    res = requests.post(f"{BASE_URL}/assignments/submit/{submission_id}", json={
        "submission_content": "This is my E2E submission."
    }, headers=student_headers)
    assert res.status_code == 200, f"Student submit assignment failed: {res.text}"
    
    # 8. Teacher marks attendance
    print("Testing teacher marking attendance...")
    # Find student ID
    student_res = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
    student_id = student_res.json()["id"]
    
    res = requests.post(f"{BASE_URL}/attendance/mark", json={
        "class_id": "c1",
        "teacher_id": "will_be_ignored_by_api",
        "records": [
            {"student_id": student_id, "status": "present"}
        ]
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Mark attendance failed: {res.text}"
    
    print("All E2E checks passed successfully!")

if __name__ == "__main__":
    run_tests()
