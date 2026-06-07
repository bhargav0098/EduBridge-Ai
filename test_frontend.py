import requests
import random
import string

BASE_URL = "http://localhost:3000/api"

def get_random_email():
    return f"testuser_{''.join(random.choices(string.ascii_lowercase, k=6))}@test.com"

def run_tests():
    print("Running Frontend E2E tests...")
    
    # 1. Register Student
    student_email = get_random_email()
    password = "password123"
    
    print(f"Registering student {student_email}...")
    res = requests.post(f"{BASE_URL}/register", json={
        "email": student_email,
        "password": password,
        "name": "E2E Student",
        "role": "student"
    })
    
    if res.status_code not in [200, 201]:
        print(f"Registration failed: {res.status_code} - {res.text}")
        return
        
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 2. Test Enrollment
    print("Testing student enrollment (Saving CS-3A, CS-3B)...")
    res = requests.post(f"{BASE_URL}/attendance/student/profile", json={
        "class_name": "CS-3A, CS-3B"
    }, headers=student_headers)
    
    if res.status_code != 200:
        print(f"Enrollment failed: {res.status_code} - {res.text}")
        return
    print(f"Enrollment response: {res.text}")
    
    # 3. Test Fetching Profile (Quiz Arena)
    print("Testing fetching profile...")
    res = requests.get(f"{BASE_URL}/attendance/student/profile", headers=student_headers)
    if res.status_code != 200:
        print(f"Fetch profile failed: {res.status_code} - {res.text}")
        return
    print(f"Profile response: {res.text}")

    # 4. Test Fetching Summary
    print("Testing fetching summary...")
    res = requests.get(f"{BASE_URL}/attendance/student/summary", headers=student_headers)
    if res.status_code != 200:
        print(f"Fetch summary failed: {res.status_code} - {res.text}")
        return
    print(f"Summary response: {res.text}")
    
if __name__ == "__main__":
    run_tests()
