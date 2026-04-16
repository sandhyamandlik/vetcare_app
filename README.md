# 🐾 VetCare - Veterinary Consultation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-Modern_Web_Framework-black?logo=fastapi)](https://fastapi.tiangolo.com) [![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev) [![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248?logo=mongodb)](https://mongodb.com) [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3+-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

**VetCare** is a full-stack web application that connects pet owners with licensed veterinarians for online consultations. Pet owners can upload pet photos, describe symptoms, receive digital prescriptions (printable/downloadable), provide feedback, and get follow-up reminders. Veterinarians manage requests, provide prescriptions, and maintain profiles.

## ✨ Features

| Pet Owner                             | Veterinarian                                 |
| ------------------------------------- | -------------------------------------------- |
| 🔍 Browse & search verified vets      | 📋 Dashboard with consultation requests      |
| 🐶 Create consultations w/ pet photos | ✅ Accept/reject requests                    |
| 💊 Download/print prescriptions       | 💉 Add prescriptions + dosages               |
| 📧 Email prescriptions                | ⏰ Set follow-up reminders                   |
| ⭐ Rate & review doctors              | ✏️ Edit profile (specialization, experience) |
| 🔔 Notification reminders             | 📈 View case stats                           |
| 📱 Responsive UI                      | 🖼️ View pet images                           |

**Key Workflows**:

- Dual-role auth (separate registration)
- Image upload (pets/profiles)
- PDF/email prescription generation
- Real-time status updates (pending/accepted/rejected)
- JWT auth, CORS, production-ready FastAPI

## 🛠️ Tech Stack

### Backend

```
FastAPI 0.110+ | Motor/MongoDB | JWT/Bcrypt | Pydantic | Uvicorn/ASGI
SMTP Email | File Uploads | CORS | Auto-docs @ /docs
```

### Frontend

```
React 18+ | TailwindCSS + Shadcn/UI | React Router | Axios | Sonner Toasts
CRACO | Lucide Icons | React Hook Form | Recharts
```

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone <repo> vetcare
cd vetcare
```

### 2. Backend (FastAPI + MongoDB)

```bash
cd backend
pip install -r requirements.txt  # or python -m pip install -r requirements.txt
cp .env.example .env  # Configure MongoDB + SMTP
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs for interactive API docs.

### 3. Frontend (React)

```bash
cd frontend
yarn install  # or npm install
yarn start
```

App runs at http://localhost:3000

### 4. Environment Variables (.env)

```env
MONGO_URL=mongodb://localhost:27017/vetcare
DB_NAME=vetcare
JWT_SECRET=your-super-secret-key-change-in-prod
CORS_ORIGINS=http://localhost:3000

# SMTP (optional - demo uses mock)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🧪 Test Credentials (Auto-seeded)

| Role          | Email                  | Password    |
| ------------- | ---------------------- | ----------- |
| **Pet Owner** | `testuser@example.com` | `user123`   |
| **Doctor**    | `sarah@vetcare.com`    | `doctor123` |
| **Doctor**    | `james@vetcare.com`    | `doctor123` |
| **Doctor**    | `emily@vetcare.com`    | `doctor123` |
| **Doctor**    | `michael@vetcare.com`  | `doctor123` |

## 📋 API Endpoints Summary

| Method | Endpoint                         | Description                 | Auth   |
| ------ | -------------------------------- | --------------------------- | ------ |
| POST   | `/api/auth/register`             | User signup                 | No     |
| POST   | `/api/auth/doctor-register`      | Doctor signup               | No     |
| POST   | `/api/auth/login`                | Login (JWT)                 | No     |
| GET    | `/api/doctors`                   | List doctors w/ ratings     | No     |
| POST   | `/api/consultations`             | Create consultation         | User   |
| GET    | `/api/consultations/user`        | User consultations          | User   |
| PUT    | `/api/consultations/{id}/status` | Accept/reject               | Doctor |
| POST   | `/api/prescriptions`             | Add prescription + reminder | Doctor |
| POST   | `/api/prescriptions/email`       | Email prescription          | User   |
| POST   | `/api/feedback`                  | Rate doctor                 | User   |
| POST   | `/api/upload`                    | Image upload                | Any    |

**Full docs**: http://localhost:8000/docs

⭐ **Star this repo if it helps!** 🐕🐱  
**Built with ❤️ for pet parents worldwide.**
