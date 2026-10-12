# AI-Assisted College Placement & Training Management Portal

> **B.Tech Computer Science & Engineering — Semester 7 Major Academic Project**

An enterprise-grade, secure, and full-stack recruitment portal designed to replace informal channels (WhatsApp groups, spreadsheets, Google Forms) with a centralized platform featuring **deterministic rule-based eligibility verification**, **transparent application tracking**, **genuine Microsoft Excel (.xlsx) reporting**, and **advisory LLM-powered resume analytics**.

---

## 🏗️ System Architecture Overview

```
                      +---------------------------------------+
                      |       Student / TPO Admin (Browser)   |
                      +---------------------------------------+
                                          |
                                    HTTPS / JSON
                                          v
+-----------------------------------------------------------------------------------+
| FRONTEND: React 19 + Vite + Tailwind CSS + Lucide React + Recharts                |
| - Role-based Protected Route Navigation (Student & TPO views)                     |
| - Profile Editor with Academic & Technical Snapshots                              |
| - Opportunity Catalog with Transparent Eligibility Reason Explanations            |
| - Application Pipeline Tracking (Applied -> Shortlisted -> Interview -> Selected) |
| - Advisory AI Resume Match & Insights Widgets                                    |
+-----------------------------------------------------------------------------------+
                                          |
                                    REST API calls
                                          v
+-----------------------------------------------------------------------------------+
| BACKEND: Python 3.12 + FastAPI + Pydantic v2 + OpenPyXL + PyJWT                   |
| - Role-Based Access Control (RBAC): Student vs TPO Placement Officer              |
| - Server-Side Deterministic Eligibility Engine (CGPA, Branch, Backlogs, Year)     |
| - Duplicate Application & Deadline Guard Rules                                    |
| - Microsoft Excel Export Engine (Formulas neutralized, frozen headers, styled)    |
| - Standalone AI Integration Service (Google Gemini / Resilient Mock Fallback)     |
+-----------------------------------------------------------------------------------+
                               |                             |
                               v                             v
                +----------------------------+  +----------------------------+
                | DATABASE: MongoDB Atlas    |  | AI: LLM Advisory Service   |
                | - Users & Auth Profiles    |  | - Resume Extraction (PDF)  |
                | - Opportunities & Policies |  | - Structured JSON Matching |
                | - Preserved Snapshots      |  | - Skill Gap Insights       |
                | - Audit Logs & History     |  | - Fallback mock mode       |
                +----------------------------+  +----------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale & Academic Defense |
|---|---|---|
| **Frontend** | React 19 + Vite | Blazing-fast Hot Module Replacement (HMR), small bundle sizes, reactive state management |
| **Styling & UI** | Tailwind CSS v4 + Lucide React | High-contrast, clean SaaS academic dashboard design, zero CSS bloat |
| **Backend** | Python 3.12 + FastAPI | Async high throughput, native OpenAPI/Swagger docs (`/docs`), strict Pydantic v2 schemas |
| **Database** | MongoDB Atlas / PyMongo / Motor | Flexible JSON schema for academic profiles, indexed sub-documents, native duplicate guards |
| **Security** | PyJWT + Passlib (Bcrypt) | Stateless JWT authorization with salted cryptographic password hashing |
| **Excel Export** | OpenPyXL | Generates genuine `.xlsx` spreadsheet files with styling, auto-filter, and formula-injection defenses |
| **AI Integration** | Google Gemini API + Mock Fallback | Explainable resume parsing and skill matching behind backend proxy; resilient fallback prevents portal outage |

---

## 🚀 Quick Start Guide (Windows PowerShell)

### Prerequisites Verified:
- **Node.js**: v24.x
- **Python**: 3.12.x
- **Git**: 2.44.x

---

### Step 1: Start the Backend (FastAPI)

Open a PowerShell terminal in the project directory:

```powershell
cd "backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

> **API Documentation (Swagger UI)**: Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.  
> **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Step 2: Start the Frontend (Vite + React)

Open a **second** PowerShell terminal in the project directory:

```powershell
cd "frontend"
npm run dev
```

> **Web Application**: Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Backend Health

To verify backend tests:

```powershell
cd "backend"
.\.venv\Scripts\python.exe -m pytest
```

---

---

## 👥 Demo Accounts & Seeding

A comprehensive demonstration seeder script is included to immediately populate the portal with realistic students, placement drives, applications across all stages, and interview rounds for viva presentations:

```powershell
cd "backend"
.\.venv\Scripts\python.exe scripts/seed_demo_data.py
```

### Pre-Configured Demo Credentials:
- **TPO Placement Administrator (Super Admin)**:
  - **Email**: `admin@tpo.college.edu`
  - **Password**: `Admin@12345`
  - *Capabilities*: Create/publish drives, filter candidates, export genuine `.xlsx` spreadsheets, schedule interviews, view Recharts analytics.
- **Student Candidate (Demo)**:
  - **Email**: `student@college.edu`
  - **Password**: `Student@12345`
  - *Candidate*: Aarav Sharma (CSE, 8.85 CGPA, 0 Backlogs)
  - *Capabilities*: View drives, verify rule-based eligibility, apply, AI Resume Analyzer, track pipeline, view scheduled interviews & notifications.

---

## 🎓 Academic Viva & Project Documentation

For comprehensive Semester 7 viva defense preparation, architecture diagrams, schema dictionaries, and top 20 viva examiner Q&A, refer to:
👉 **[`ACADEMIC_VIVA_AND_PROJECT_GUIDE.md`](./ACADEMIC_VIVA_AND_PROJECT_GUIDE.md)**

---

## 📋 Implementation Roadmap

- [x] **Milestone 1**: Project Architecture, Repository Layout, Environment Configuration & Full-Stack Health Diagnostics.
- [x] **Milestone 2**: Database Schema Design, MongoDB Setup, Unique Constraints & Super-Admin Seeder.
- [x] **Milestone 3**: Authentication & Role-Based Access Control (JWT, Password Hashing, Student Registration & Login).
- [x] **Milestone 4**: Student Profile Module (Academic records, skill tags, PDF resume parsing with `pypdf`).
- [x] **Milestone 5**: Placement Opportunity Module & Rule-Based Eligibility Engine (CGPA, Branch, Backlog filters).
- [x] **Milestone 6**: Application Management Pipeline & Status Progression (Applied -> Review -> Shortlist -> Interview -> Selected).
- [x] **Milestone 7**: Genuine Microsoft Excel (.xlsx) Export Engine (OpenPyXL, frozen panes, formula injection defense).
- [x] **Milestone 8**: Interview Scheduling & In-App Notification Engine.
- [x] **Milestone 9**: Advisory AI Service (Google Gemini REST integration, job-match scoring, skill-gap analysis, mock fallback).
- [x] **Milestone 10**: Placement Analytics & Recharts Dashboards (Department BarChart, Funnel AreaChart, Donut PieChart, CTC metrics).
- [x] **Milestone 11**: Production Deployment Configurations (Vercel SPA rewrites, Dockerfile, Render blueprint, Procfile).
- [x] **Milestone 12**: Academic Viva Defense Guide, Architecture Diagrams & End-to-End Test Suite (49/49 Passing).
