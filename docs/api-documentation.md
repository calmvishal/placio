# REST API Documentation

## Base URL
- **Local Development**: `http://localhost:8000/api`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register Student Account
* **Endpoint:** `POST /api/auth/register`
* **Access Role:** Public

### 1.2 User Login
* **Endpoint:** `POST /api/auth/login`
* **Access Role:** Public

### 1.3 Get Current Authenticated User Profile
* **Endpoint:** `GET /api/auth/me`
* **Access Role:** Authenticated (`Bearer <token>`)

---

## 2. Student Profile Endpoints (`/api/students`)

### 2.1 Get Student Profile & Completion Score
* **Endpoint:** `GET /api/students/profile`
* **Access Role:** Student (`role: student`)

### 2.2 Update Student Academic & Professional Records
* **Endpoint:** `PUT /api/students/profile`
* **Access Role:** Student (`role: student`)

### 2.3 Upload Resume PDF (Text Extraction)
* **Endpoint:** `POST /api/students/resume/upload`
* **Access Role:** Student (`role: student`)

### 2.4 Download Stored Resume PDF
* **Endpoint:** `GET /api/students/resume/download`
* **Access Role:** Student (own resume) or TPO Admin (`?student_id=<id>`)

---

## 3. Placement Opportunities & Eligibility Endpoints (`/api/jobs`)

### 3.1 Create Placement Drive Opportunity
* **Endpoint:** `POST /api/jobs`
* **Access Role:** TPO Administrator or Staff (`role: tpo_admin | tpo_staff`)
* **Header:** `Authorization: Bearer <tpo_token>`

**Request Body:**
```json
{
  "company_name": "Microsoft India",
  "title": "Software Development Engineer - 1",
  "description": "Develop scalable Azure distributed microservices.",
  "job_type": "Full-Time",
  "required_branches": ["CSE", "IT", "ECE"],
  "min_cgpa": 7.5,
  "graduation_year": 2026,
  "max_active_backlogs": 0,
  "required_skills": ["Data Structures", "C++", "System Design"],
  "location": "Hyderabad, India",
  "work_mode": "Hybrid",
  "salary_package": "18.5 LPA",
  "application_deadline": "2026-11-15T18:00:00Z",
  "status": "published"
}
```

---

### 3.2 List Opportunities with Deterministic Eligibility Evaluation
* **Endpoint:** `GET /api/jobs`
* **Access Role:** Authenticated (Students or TPO)
* **Behavior:**
  - When called by a **Student**: Evaluates each published drive against the student's CGPA, branch, backlogs, and batch. Returns `is_eligible`, `can_apply`, `already_applied`, `deadline_passed`, and `eligibility_criteria` list.
  - When called by a **TPO**: Returns all drives (draft, published, closed) with applicant counts.

**Sample Student Response Item (`200 OK`):**
```json
{
  "id": "67089c20a14b5321f9e80123",
  "company_name": "Microsoft India",
  "title": "Software Development Engineer - 1",
  "salary_package": "18.5 LPA",
  "min_cgpa": 7.5,
  "max_active_backlogs": 0,
  "is_eligible": true,
  "can_apply": true,
  "already_applied": false,
  "deadline_passed": false,
  "eligibility_criteria": [
    {
      "rule": "Graduation Batch",
      "passed": true,
      "student_value": "2026",
      "required_value": "2026",
      "message": "Graduation batch 2026 matches required batch."
    },
    {
      "rule": "Department / Branch",
      "passed": true,
      "student_value": "CSE",
      "required_value": "CSE, IT, ECE",
      "message": "Department 'CSE' is eligible."
    },
    {
      "rule": "Minimum CGPA",
      "passed": true,
      "student_value": "8.75",
      "required_value": "7.50",
      "message": "Current CGPA 8.75 meets requirement (min 7.50)."
    },
    {
      "rule": "Active Backlogs Policy",
      "passed": true,
      "student_value": "0",
      "required_value": "Max 0",
      "message": "Active backlogs (0) satisfies policy (maximum allowed: 0)."
    }
  ]
}
```

---

### 3.3 Update Placement Opportunity
* **Endpoint:** `PUT /api/jobs/{job_id}`
* **Access Role:** TPO Admin / Staff

### 3.4 Delete Placement Opportunity
* **Endpoint:** `DELETE /api/jobs/{job_id}`
* **Access Role:** TPO Admin only

---

## 4. System Diagnostics Endpoints

### 4.1 Health Check
* **Endpoint:** `GET /api/health`
* **Access Role:** Public
