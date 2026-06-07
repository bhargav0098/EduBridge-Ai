import requests
import random
import string

BASE_URL = "http://localhost:3000/api"

def get_random_email():
    return f"testuser_{''.join(random.choices(string.ascii_lowercase, k=6))}@test.com"

def run_tests():
    student_email = get_random_email()
    password = "password123"
    
    res = requests.post(f"{BASE_URL}/register", json={
        "email": student_email,
        "password": password,
        "name": "E2E Student",
        "role": "student"
    })
    
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # CREATE profile
    res = requests.post(f"{BASE_URL}/attendance/student/profile", json={
        "class_name": "CS-3A"
    }, headers=student_headers)
    print("Enrollment 1:", res.status_code, res.text)
    
    # UPDATE profile
    res = requests.post(f"{BASE_URL}/attendance/student/profile", json={
        "class_name": "CS-3B"
    }, headers=student_headers)
    print("Enrollment 2:", res.status_code, res.text)

if __name__ == "__main__":
    run_tests()
