import requests
import sys
import json
from datetime import datetime

class VetCareAPITester:
    def __init__(self, base_url="https://docpet-platform.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user_token = None
        self.doctor_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success and response.text:
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', response.text[:100])}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details if not success else "")
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_doctors_list(self):
        """Test GET /api/doctors"""
        success, response = self.run_test(
            "Get doctors list",
            "GET",
            "doctors",
            200
        )
        if success and 'doctors' in response:
            doctors = response['doctors']
            if len(doctors) >= 4:
                self.log_test("Doctors seeded correctly", True)
                return doctors
            else:
                self.log_test("Doctors seeded correctly", False, f"Expected 4+ doctors, got {len(doctors)}")
        return []

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User login",
            "POST",
            "auth/login",
            200,
            data={"email": "testuser@example.com", "password": "user123"}
        )
        if success and 'token' in response:
            self.user_token = response['token']
            user = response.get('user', {})
            if user.get('role') == 'user':
                self.log_test("User role verification", True)
            else:
                self.log_test("User role verification", False, f"Expected role 'user', got {user.get('role')}")
            return True
        return False

    def test_doctor_login(self):
        """Test doctor login"""
        success, response = self.run_test(
            "Doctor login",
            "POST",
            "auth/login",
            200,
            data={"email": "sarah@vetcare.com", "password": "doctor123"}
        )
        if success and 'token' in response:
            self.doctor_token = response['token']
            user = response.get('user', {})
            if user.get('role') == 'doctor':
                self.log_test("Doctor role verification", True)
            else:
                self.log_test("Doctor role verification", False, f"Expected role 'doctor', got {user.get('role')}")
            return True
        return False

    def test_user_auth_me(self):
        """Test GET /api/auth/me for user"""
        if not self.user_token:
            self.log_test("User auth/me", False, "No user token available")
            return False
        
        success, response = self.run_test(
            "User auth/me",
            "GET",
            "auth/me",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    def test_doctor_auth_me(self):
        """Test GET /api/auth/me for doctor"""
        if not self.doctor_token:
            self.log_test("Doctor auth/me", False, "No doctor token available")
            return False
        
        success, response = self.run_test(
            "Doctor auth/me",
            "GET",
            "auth/me",
            200,
            headers={"Authorization": f"Bearer {self.doctor_token}"}
        )
        return success

    def test_create_consultation(self, doctors):
        """Test creating a consultation"""
        if not self.user_token or not doctors:
            self.log_test("Create consultation", False, "No user token or doctors available")
            return None
        
        doctor_id = doctors[0]['id']
        consultation_data = {
            "doctor_id": doctor_id,
            "pet_name": "Buddy",
            "pet_age": "3 years",
            "pet_type": "Dog",
            "problem": "My dog has been limping for the past few days"
        }
        
        success, response = self.run_test(
            "Create consultation",
            "POST",
            "consultations",
            200,
            data=consultation_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if success and 'consultation' in response:
            return response['consultation']['id']
        return None

    def test_get_user_consultations(self):
        """Test GET /api/consultations/user"""
        if not self.user_token:
            self.log_test("Get user consultations", False, "No user token available")
            return []
        
        success, response = self.run_test(
            "Get user consultations",
            "GET",
            "consultations/user",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if success and 'consultations' in response:
            return response['consultations']
        return []

    def test_get_doctor_consultations(self):
        """Test GET /api/consultations/doctor"""
        if not self.doctor_token:
            self.log_test("Get doctor consultations", False, "No doctor token available")
            return []
        
        success, response = self.run_test(
            "Get doctor consultations",
            "GET",
            "consultations/doctor",
            200,
            headers={"Authorization": f"Bearer {self.doctor_token}"}
        )
        
        if success and 'consultations' in response:
            return response['consultations']
        return []

    def test_accept_consultation(self, consultation_id):
        """Test accepting a consultation"""
        if not self.doctor_token or not consultation_id:
            self.log_test("Accept consultation", False, "No doctor token or consultation ID")
            return False
        
        success, response = self.run_test(
            "Accept consultation",
            "PUT",
            f"consultations/{consultation_id}/status",
            200,
            data={"status": "accepted"},
            headers={"Authorization": f"Bearer {self.doctor_token}"}
        )
        return success

    def test_add_prescription(self, consultation_id):
        """Test adding a prescription"""
        if not self.doctor_token or not consultation_id:
            self.log_test("Add prescription", False, "No doctor token or consultation ID")
            return False
        
        prescription_data = {
            "consultation_id": consultation_id,
            "medicine": "Carprofen",
            "dosage": "2mg per kg body weight, twice daily",
            "notes": "Give with food to reduce stomach upset"
        }
        
        success, response = self.run_test(
            "Add prescription",
            "POST",
            "prescriptions",
            200,
            data=prescription_data,
            headers={"Authorization": f"Bearer {self.doctor_token}"}
        )
        return success

    def test_add_feedback(self, doctors):
        """Test adding feedback"""
        if not self.user_token or not doctors:
            self.log_test("Add feedback", False, "No user token or doctors available")
            return False
        
        doctor_id = doctors[0]['id']
        feedback_data = {
            "doctor_id": doctor_id,
            "rating": 5,
            "comment": "Excellent service! Very professional and caring."
        }
        
        success, response = self.run_test(
            "Add feedback",
            "POST",
            "feedback",
            200,
            data=feedback_data,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    def test_get_doctor_profile(self, doctors):
        """Test getting a specific doctor profile"""
        if not doctors:
            self.log_test("Get doctor profile", False, "No doctors available")
            return False
        
        doctor_id = doctors[0]['id']
        success, response = self.run_test(
            "Get doctor profile",
            "GET",
            f"doctors/{doctor_id}",
            200
        )
        
        if success and 'doctor' in response:
            doctor = response['doctor']
            if 'feedback' in doctor:
                self.log_test("Doctor profile includes feedback", True)
            else:
                self.log_test("Doctor profile includes feedback", False, "No feedback field in response")
        
        return success

    def test_update_doctor_profile(self):
        """Test updating doctor profile"""
        if not self.doctor_token:
            self.log_test("Update doctor profile", False, "No doctor token available")
            return False
        
        update_data = {
            "phone": "+15550199",
            "experience": 13
        }
        
        success, response = self.run_test(
            "Update doctor profile",
            "PUT",
            "doctors/update-profile",
            200,
            data=update_data,
            headers={"Authorization": f"Bearer {self.doctor_token}"}
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting VetCare API Tests...")
        print("=" * 50)
        
        # Test basic endpoints
        doctors = self.test_doctors_list()
        
        # Test authentication
        user_login_success = self.test_user_login()
        doctor_login_success = self.test_doctor_login()
        
        if user_login_success:
            self.test_user_auth_me()
        
        if doctor_login_success:
            self.test_doctor_auth_me()
        
        # Test consultation flow
        consultation_id = None
        if user_login_success and doctors:
            consultation_id = self.test_create_consultation(doctors)
            self.test_get_user_consultations()
        
        if doctor_login_success:
            doctor_consultations = self.test_get_doctor_consultations()
            
            # If we created a consultation, try to accept it and add prescription
            if consultation_id:
                if self.test_accept_consultation(consultation_id):
                    self.test_add_prescription(consultation_id)
        
        # Test feedback
        if user_login_success and doctors:
            self.test_add_feedback(doctors)
        
        # Test doctor profile
        if doctors:
            self.test_get_doctor_profile(doctors)
        
        if doctor_login_success:
            self.test_update_doctor_profile()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = VetCareAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())