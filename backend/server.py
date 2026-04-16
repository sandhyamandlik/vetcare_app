from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret')
JWT_ALGORITHM = "HS256"

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password) -> bool:
    try:
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode("utf-8")

        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password
        )
    except Exception as e:
        print("❌ Password verify error:", e)
        return False
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        role = payload.get("role")
        user_id = payload.get("sub")
        if role == "doctor":
            user = await db.doctors.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        else:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def send_welcome_email(to_email: str, name: str, role: str = "user"):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")

    try:
        html_content = f"""
        <html>
        <body style="font-family:Arial;background:#f5f7fb;padding:20px;">
            <div style="max-width:600px;margin:auto;background:white;padding:25px;border-radius:10px;">
                
                <h2 style="color:#2e7d32;">🐾 Welcome to VetCare</h2>

                <p>Hi <b>{name}</b>,</p>

                <p>
                    Your {role} account has been successfully created.
                    You can now use VetCare platform.
                </p>

                <div style="background:#f0fdf4;padding:15px;border-radius:8px;">
                    <h3>What you can do:</h3>
                    <ul>
                        <li>Book veterinary consultations</li>
                        <li>Upload pet details</li>
                        <li>Get prescriptions online</li>
                        <li>Connect with verified doctors</li>
                    </ul>
                </div>

                <p style="margin-top:20px;color:gray;font-size:12px;">
                    VetCare • Smart Pet Healthcare System 🐶🐱
                </p>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Welcome to VetCare 🐾"
        msg["From"] = smtp_user
        msg["To"] = to_email

        msg.attach(MIMEText("Welcome to VetCare!", "plain"))
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()

        logger.info(f"Welcome email sent to {to_email}")

    except Exception as e:
        logger.error(f"Email failed: {str(e)}")
# ===================== PYDANTIC MODELS =====================

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class DoctorRegister(BaseModel):
    name: str
    email: str
    password: str
    specialization: str
    experience: int
    cases_solved: int
    phone: str = ""
    profile_image: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class ConsultationCreate(BaseModel):
    doctor_id: str
    pet_name: str
    pet_age: str
    pet_type: str
    problem: str
    pet_image: str = ""

class PrescriptionCreate(BaseModel):
    consultation_id: str
    medicine: str
    dosage: str
    notes: str = ""
    follow_up_date: Optional[str] = None
    follow_up_note: Optional[str] = None

class FeedbackCreate(BaseModel):
    doctor_id: str
    rating: int
    comment: str = ""

class DoctorProfileUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[int] = None
    cases_solved: Optional[int] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None

class ConsultationStatusUpdate(BaseModel):
    status: str

class EmailPrescriptionRequest(BaseModel):
    consultation_id: str
    recipient_email: str

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register_user(data: UserRegister):
    email = data.email.lower().strip()

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())

    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.insert_one(user_doc)

    # ✅ NON-BLOCKING EMAIL
    asyncio.create_task(
    asyncio.to_thread(send_welcome_email, email, data.name, "user")
    )

    token = create_access_token(user_id, email, "user")

    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": data.name,
            "email": email,
            "role": "user"
        }
    }
@api_router.post("/auth/doctor-register")
async def register_doctor(data: DoctorRegister):
    email = data.email.lower().strip()
    existing = await db.doctors.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered as user")
    doctor_id = str(uuid.uuid4())
    doctor_doc = {
        "id": doctor_id,
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "specialization": data.specialization,
        "experience": data.experience,
        "cases_solved": data.cases_solved,
        "phone": data.phone,
        "profile_image": data.profile_image,
        "role": "doctor",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.doctors.insert_one(doctor_doc)
    asyncio.create_task(
    asyncio.to_thread(send_welcome_email, email, data.name, "doctor")
)
    token = create_access_token(doctor_id, email, "doctor")
    doc_response = {k: v for k, v in doctor_doc.items() if k not in ("_id", "password_hash")}
    return {"token": token, "user": doc_response}

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    email = data.email.lower().strip()

    print("LOGIN EMAIL:", email)
    print("ENTERED PASSWORD:", data.password)

    doctor = await db.doctors.find_one({"email": email}, {"_id": 0})
    if doctor:
        print("Doctor found")
        print("Stored hash:", doctor["password_hash"])
        print("Match:", verify_password(data.password, doctor["password_hash"]))

    if doctor and verify_password(data.password, doctor["password_hash"]):
        token = create_access_token(doctor["id"], email, "doctor")
        doctor.pop("password_hash", None)
        return {"token": token, "user": doctor}

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        print("User found")
        print("Stored hash:", user["password_hash"])
        print("Match:", verify_password(data.password, user["password_hash"]))

    if user and verify_password(data.password, user["password_hash"]):
        token = create_access_token(user["id"], email, "user")
        user.pop("password_hash", None)
        return {"token": token, "user": user}

    print("LOGIN FAILED ❌")
    raise HTTPException(status_code=401, detail="Invalid email or password")

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

# ===================== DOCTOR ROUTES =====================

@api_router.get("/doctors")
async def list_doctors():
    doctors = await db.doctors.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    for doc in doctors:
        feedback_list = await db.feedback.find({"doctor_id": doc["id"]}, {"_id": 0}).to_list(100)
        if feedback_list:
            doc["avg_rating"] = round(sum(f["rating"] for f in feedback_list) / len(feedback_list), 1)
            doc["review_count"] = len(feedback_list)
        else:
            doc["avg_rating"] = 0
            doc["review_count"] = 0
    return {"doctors": doctors}

@api_router.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    doctor = await db.doctors.find_one({"id": doctor_id}, {"_id": 0, "password_hash": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    feedback_list = await db.feedback.find({"doctor_id": doctor_id}, {"_id": 0}).to_list(100)
    doctor["feedback"] = feedback_list
    if feedback_list:
        doctor["avg_rating"] = round(sum(f["rating"] for f in feedback_list) / len(feedback_list), 1)
        doctor["review_count"] = len(feedback_list)
    else:
        doctor["avg_rating"] = 0
        doctor["review_count"] = 0
    return {"doctor": doctor}

@api_router.put("/doctors/update-profile")
async def update_doctor_profile(data: DoctorProfileUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update their profile")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.doctors.update_one({"id": user["id"]}, {"$set": update_data})
    updated = await db.doctors.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"doctor": updated}

# ===================== CONSULTATION ROUTES =====================

@api_router.post("/consultations")
async def create_consultation(data: ConsultationCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can create consultations")
    doctor = await db.doctors.find_one({"id": data.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    consultation_id = str(uuid.uuid4())
    consultation_doc = {
        "id": consultation_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "doctor_id": data.doctor_id,
        "doctor_name": doctor.get("name", ""),
        "pet_name": data.pet_name,
        "pet_age": data.pet_age,
        "pet_type": data.pet_type,
        "problem": data.problem,
        "pet_image": data.pet_image,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.consultations.insert_one(consultation_doc)
    resp = {k: v for k, v in consultation_doc.items() if k != "_id"}
    return {"consultation": resp}

@api_router.get("/consultations/user")
async def get_user_consultations(request: Request):
    user = await get_current_user(request)
    consultations = await db.consultations.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for c in consultations:
        doctor = await db.doctors.find_one({"id": c["doctor_id"]}, {"_id": 0, "password_hash": 0})
        c["doctor"] = doctor
        prescriptions = await db.prescriptions.find({"consultation_id": c["id"]}, {"_id": 0}).to_list(20)
        c["prescriptions"] = prescriptions
    return {"consultations": consultations}

@api_router.get("/consultations/doctor")
async def get_doctor_consultations(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view their consultations")
    consultations = await db.consultations.find(
        {"doctor_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    for c in consultations:
        prescriptions = await db.prescriptions.find({"consultation_id": c["id"]}, {"_id": 0}).to_list(20)
        c["prescriptions"] = prescriptions
    return {"consultations": consultations}

@api_router.put("/consultations/{consultation_id}/status")
async def update_consultation_status(consultation_id: str, data: ConsultationStatusUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update consultation status")
    if data.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'rejected'")
    result = await db.consultations.update_one(
        {"id": consultation_id, "doctor_id": user["id"]},
        {"$set": {"status": data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return {"message": f"Consultation {data.status}"}

# ===================== PRESCRIPTION ROUTES =====================

@api_router.post("/prescriptions")
async def add_prescription(data: PrescriptionCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can add prescriptions")
    consultation = await db.consultations.find_one({"id": data.consultation_id, "doctor_id": user["id"]})
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    prescription_id = str(uuid.uuid4())
    prescription_doc = {
        "id": prescription_id,
        "consultation_id": data.consultation_id,
        "doctor_id": user["id"],
        "medicine": data.medicine,
        "dosage": data.dosage,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.prescriptions.insert_one(prescription_doc)

    # Create follow-up reminder if date provided
    reminder_resp = None
    if data.follow_up_date:
        reminder_id = str(uuid.uuid4())
        reminder_doc = {
            "id": reminder_id,
            "user_id": consultation["user_id"],
            "doctor_id": user["id"],
            "doctor_name": user.get("name", ""),
            "consultation_id": data.consultation_id,
            "pet_name": consultation.get("pet_name", ""),
            "follow_up_date": data.follow_up_date,
            "message": data.follow_up_note or f"Follow-up consultation for {consultation.get('pet_name', 'your pet')}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.reminders.insert_one(reminder_doc)
        reminder_resp = {k: v for k, v in reminder_doc.items() if k != "_id"}

    resp = {k: v for k, v in prescription_doc.items() if k != "_id"}
    return {"prescription": resp, "reminder": reminder_resp}

@api_router.get("/prescriptions/{consultation_id}")
async def get_prescriptions(consultation_id: str):
    prescriptions = await db.prescriptions.find(
        {"consultation_id": consultation_id}, {"_id": 0}
    ).to_list(50)
    return {"prescriptions": prescriptions}

@api_router.get("/prescriptions-history/user")
async def get_user_prescription_history(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can view prescription history")
    consultations = await db.consultations.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    results = []
    for c in consultations:
        prescriptions = await db.prescriptions.find({"consultation_id": c["id"]}, {"_id": 0}).to_list(20)
        if prescriptions:
            doctor = await db.doctors.find_one({"id": c["doctor_id"]}, {"_id": 0, "password_hash": 0})
            results.append({
                "consultation_id": c["id"],
                "pet_name": c["pet_name"],
                "pet_type": c["pet_type"],
                "pet_age": c["pet_age"],
                "problem": c["problem"],
                "status": c["status"],
                "created_at": c["created_at"],
                "doctor": doctor,
                "prescriptions": prescriptions,
            })
    return {"history": results}

@api_router.post("/prescriptions/email")
async def email_prescription(data: EmailPrescriptionRequest, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can email prescriptions")
    consultation = await db.consultations.find_one({"id": data.consultation_id, "user_id": user["id"]}, {"_id": 0})
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    prescriptions = await db.prescriptions.find({"consultation_id": data.consultation_id}, {"_id": 0}).to_list(20)
    if not prescriptions:
        raise HTTPException(status_code=400, detail="No prescriptions to email")
    doctor = await db.doctors.find_one({"id": consultation["doctor_id"]}, {"_id": 0, "password_hash": 0})
    date_str = datetime.fromisoformat(consultation["created_at"]).strftime("%B %d, %Y")

    rx_rows = ""
    for i, p in enumerate(prescriptions, 1):
        notes_line = f'<tr><td style="padding:4px 12px;color:#718096;font-size:13px;font-style:italic;" colspan="3">Note: {p["notes"]}</td></tr>' if p.get("notes") else ""
        rx_rows += f'''<tr style="background:{'#f9fafb' if i % 2 == 0 else '#ffffff'}">
            <td style="padding:10px 12px;font-weight:600;color:#1E392A;">{p["medicine"]}</td>
            <td style="padding:10px 12px;color:#4A5568;">{p["dosage"]}</td>
        </tr>{notes_line}'''

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#1E392A;padding:24px 30px;border-radius:12px 12px 0 0;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;">VetCare <span style="color:#E07A5F;">Prescription</span></h1>
            <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Veterinary Consultation Platform</p>
        </div>
        <div style="padding:30px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="color:#4A5568;margin:0 0 20px;">Dear {user.get("name", "Pet Owner")},</p>
            <p style="color:#4A5568;margin:0 0 20px;">Here is your prescription from <strong>{doctor.get("name", "your veterinarian")}</strong>, dated {date_str}.</p>

            <div style="background:#F4F1DE;border-radius:10px;padding:16px;margin-bottom:20px;">
                <h3 style="color:#1E392A;margin:0 0 8px;font-size:15px;">Pet Details</h3>
                <p style="color:#4A5568;margin:0;font-size:14px;"><strong>{consultation["pet_name"]}</strong> ({consultation["pet_type"]}) &mdash; Age: {consultation["pet_age"]}</p>
                <p style="color:#718096;margin:6px 0 0;font-size:13px;">{consultation["problem"]}</p>
            </div>

            <h3 style="color:#1E392A;margin:0 0 10px;font-size:15px;">Prescribed Medications</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                <thead><tr style="background:#81B29A;">
                    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:13px;">Medicine</th>
                    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:13px;">Dosage</th>
                </tr></thead>
                <tbody>{rx_rows}</tbody>
            </table>

            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;">
                <p style="color:#718096;font-size:12px;margin:0;">This prescription was generated via VetCare. Please follow the prescribed dosage and consult your vet if symptoms persist.</p>
            </div>
        </div>
    </div>
    """

    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"VetCare Prescription - {consultation['pet_name']}"
            msg["From"] = smtp_user
            msg["To"] = data.recipient_email
            msg.attach(MIMEText(html_body, "html"))
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, data.recipient_email, msg.as_string())
            logger.info(f"Prescription email sent to {data.recipient_email}")
            return {"message": "Prescription emailed successfully", "mocked": False}
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")
    else:
        logger.info(f"[MOCK EMAIL] Prescription for {consultation['pet_name']} would be sent to {data.recipient_email}")
        logger.info(f"[MOCK EMAIL] Contains {len(prescriptions)} prescription(s) from Dr. {doctor.get('name', 'N/A')}")
        return {"message": "Prescription email sent (demo mode - configure SMTP for real delivery)", "mocked": True}

# ===================== FEEDBACK ROUTES =====================

@api_router.post("/feedback")
async def add_feedback(data: FeedbackCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can add feedback")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    feedback_id = str(uuid.uuid4())
    feedback_doc = {
        "id": feedback_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "doctor_id": data.doctor_id,
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(feedback_doc)
    resp = {k: v for k, v in feedback_doc.items() if k != "_id"}
    return {"feedback": resp}

@api_router.get("/feedback/{doctor_id}")
async def get_doctor_feedback(doctor_id: str):
    feedback_list = await db.feedback.find(
        {"doctor_id": doctor_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"feedback": feedback_list}

# ===================== REMINDER ROUTES =====================

@api_router.get("/reminders/user")
async def get_user_reminders(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "user":
        raise HTTPException(status_code=403, detail="Only users can view reminders")
    reminders = await db.reminders.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("follow_up_date", 1).to_list(100)
    return {"reminders": reminders}

@api_router.put("/reminders/{reminder_id}/dismiss")
async def dismiss_reminder(reminder_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder dismissed"}

@api_router.put("/reminders/dismiss-all")
async def dismiss_all_reminders(request: Request):
    user = await get_current_user(request)
    await db.reminders.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All reminders dismissed"}

# ===================== UPLOAD ROUTES =====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": filename, "url": f"/api/uploads/{filename}"}

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# ===================== STARTUP & SEED =====================

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.doctors.create_index("email", unique=True)
    await db.consultations.create_index("user_id")
    await db.consultations.create_index("doctor_id")
    await db.prescriptions.create_index("consultation_id")
    await db.feedback.create_index("doctor_id")
    await db.reminders.create_index("user_id")

    existing_count = await db.doctors.count_documents({})
    if existing_count == 0:
        sample_doctors = [
            {
                "id": str(uuid.uuid4()),
                "name": "Dr. Sarah Mitchell",
                "email": "sarah@vetcare.com",
                "password_hash": hash_password("doctor123"),
                "specialization": "Small Animal Surgery",
                "experience": 12,
                "cases_solved": 340,
                "phone": "+15550101",
                "profile_image": "https://images.unsplash.com/photo-1622253694238-3b22139576c6?w=400&h=400&fit=crop",
                "role": "doctor",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Dr. James Rodriguez",
                "email": "james@vetcare.com",
                "password_hash": hash_password("doctor123"),
                "specialization": "Feline Medicine",
                "experience": 8,
                "cases_solved": 215,
                "phone": "+15550102",
                "profile_image": "https://images.unsplash.com/photo-1736289173074-df6009da27c9?w=400&h=400&fit=crop",
                "role": "doctor",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Dr. Emily Chen",
                "email": "emily@vetcare.com",
                "password_hash": hash_password("doctor123"),
                "specialization": "Veterinary Dermatology",
                "experience": 10,
                "cases_solved": 280,
                "phone": "+15550103",
                "profile_image": "https://images.unsplash.com/photo-1756699197173-5ef672a423fa?w=400&h=400&fit=crop",
                "role": "doctor",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Dr. Michael Brooks",
                "email": "michael@vetcare.com",
                "password_hash": hash_password("doctor123"),
                "specialization": "Exotic Animal Care",
                "experience": 15,
                "cases_solved": 420,
                "phone": "+15550104",
                "profile_image": "https://images.pexels.com/photos/6235124/pexels-photo-6235124.jpeg?w=400&h=400&fit=crop",
                "role": "doctor",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.doctors.insert_many(sample_doctors)
        logger.info("Seeded 4 sample doctors")

    existing_user = await db.users.find_one({"email": "testuser@example.com"})
    if not existing_user:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Test User",
            "email": "testuser@example.com",
            "password_hash": hash_password("user123"),
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Seeded test user")

    # Write test credentials
    creds_path = ROOT_DIR / "memory" / "test_credentials.md"
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(
        "# Test Credentials\n\n"
        "## Test User\n- Email: testuser@example.com\n- Password: user123\n- Role: user\n\n"
        "## Sample Doctors (all password: doctor123)\n"
        "- sarah@vetcare.com (Dr. Sarah Mitchell)\n"
        "- james@vetcare.com (Dr. James Rodriguez)\n"
        "- emily@vetcare.com (Dr. Emily Chen)\n"
        "- michael@vetcare.com (Dr. Michael Brooks)\n\n"
        "## Auth Endpoints\n"
        "- POST /api/auth/register\n"
        "- POST /api/auth/doctor-register\n"
        "- POST /api/auth/login\n"
        "- GET /api/auth/me\n"
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
