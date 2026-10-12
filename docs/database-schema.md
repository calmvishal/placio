# Database Schema & Data Dictionary

## 1. Overview
The database layer is managed through **MongoDB (Motor async driver / PyMongo)** with strict indexes to guarantee data integrity, unique identity constraints, and database-level prevention of duplicate applications.

---

## 2. Collections & Document Specifications

### Collection: `users`
Stores credentials and fundamental role authorizations.
```json
{
  "_id": "ObjectId",
  "email": "string (lowercase, unique)",
  "hashed_password": "string (bcrypt hash, 60 chars)",
  "full_name": "string",
  "role": "string (enum: 'student' | 'tpo_admin' | 'tpo_staff')",
  "is_active": "boolean (default: true)",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
* **Indexes:**
  * `uniq_user_email`: `{ email: 1 }` (Unique)
  * `idx_user_role`: `{ role: 1 }`

---

### Collection: `student_profiles`
Maintains detailed academic records, skill tags, and profile snapshots.
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (references users._id, unique)",
  "roll_number": "string (unique, college registration number)",
  "phone": "string",
  "department": "string (e.g., 'CSE', 'ECE', 'IT')",
  "branch": "string (e.g., 'Computer Science & Engineering')",
  "graduation_year": "integer (e.g., 2026)",
  "tenth_percentage": "float",
  "twelfth_percentage": "float",
  "cgpa": "float (e.g., 8.42)",
  "active_backlogs": "integer (e.g., 0)",
  "history_of_backlogs": "integer (e.g., 0)",
  "skills": ["string (e.g., 'Python', 'React', 'MongoDB')"],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "tech_stack": ["string"],
      "github_link": "string"
    }
  ],
  "certifications": ["string"],
  "resume_filename": "string",
  "resume_url": "string",
  "resume_extracted_text": "string (for AI analysis)",
  "github_url": "string",
  "linkedin_url": "string",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
* **Indexes:**
  * `uniq_profile_user_id`: `{ user_id: 1 }` (Unique)
  * `uniq_profile_roll_number`: `{ roll_number: 1 }` (Unique, Sparse)
  * `idx_profile_department`: `{ department: 1 }`
  * `idx_profile_grad_year`: `{ graduation_year: 1 }`
  * `idx_profile_cgpa`: `{ cgpa: 1 }`

---

### Collection: `jobs`
Maintains placement drives, compensation, and rule-based eligibility criteria.
```json
{
  "_id": "ObjectId",
  "company_name": "string",
  "title": "string (e.g., 'Associate Software Engineer')",
  "description": "string",
  "job_type": "string (enum: 'Full-Time' | 'Internship' | 'Internship+PPO')",
  "required_branches": ["string (e.g., ['CSE', 'IT'])"],
  "min_cgpa": "float (e.g., 7.0)",
  "graduation_year": "integer (e.g., 2026)",
  "min_tenth_percentage": "float",
  "min_twelfth_percentage": "float",
  "max_active_backlogs": "integer (default: 0)",
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "location": "string",
  "work_mode": "string (enum: 'On-site' | 'Hybrid' | 'Remote')",
  "salary_package": "string (e.g., '8.5 LPA' or '25,000 / month')",
  "application_opening_date": "ISODate",
  "application_deadline": "ISODate",
  "recruitment_rounds": ["string (e.g., ['Online Assessment', 'Technical Interview', 'HR Round'])"],
  "interview_instructions": "string",
  "status": "string (enum: 'draft' | 'published' | 'closed' | 'archived')",
  "created_by": "ObjectId (references users._id)",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```
* **Indexes:**
  * `idx_job_status`: `{ status: 1 }`
  * `idx_job_grad_year`: `{ graduation_year: 1 }`
  * `idx_job_deadline`: `{ application_deadline: 1 }`

---

### Collection: `applications`
Tracks student applications with an immutable profile snapshot and status progression.
```json
{
  "_id": "ObjectId",
  "job_id": "ObjectId (references jobs._id)",
  "student_id": "ObjectId (references student_profiles._id)",
  "user_id": "ObjectId (references users._id)",
  "status": "string (enum: 'Applied' | 'Under Review' | 'Shortlisted' | 'Assessment' | 'Interview Scheduled' | 'Selected' | 'Rejected' | 'Withdrawn')",
  "student_snapshot": {
    "full_name": "string",
    "roll_number": "string",
    "email": "string",
    "department": "string",
    "cgpa": "float",
    "active_backlogs": "integer",
    "skills": ["string"],
    "resume_filename": "string"
  },
  "applied_at": "ISODate",
  "status_history": [
    {
      "status": "string",
      "updated_by": "ObjectId (references users._id)",
      "updated_at": "ISODate",
      "notes": "string"
    }
  ],
  "updated_at": "ISODate"
}
```
* **Indexes:**
  * `uniq_application_job_student`: `{ job_id: 1, student_id: 1 }` (**Compound Unique — prevents duplicate applications**)
  * `idx_app_job_status`: `{ job_id: 1, status: 1 }`
  * `idx_app_student_id`: `{ student_id: 1 }`
  * `idx_app_applied_at`: `{ applied_at: 1 }`

---

### Collection: `interviews`
Records scheduled interview rounds and logistics.
```json
{
  "_id": "ObjectId",
  "job_id": "ObjectId (references jobs._id)",
  "student_id": "ObjectId (references student_profiles._id)",
  "round_name": "string (e.g., 'Round 1: DSA & System Design')",
  "scheduled_at": "ISODate",
  "mode": "string (enum: 'online' | 'offline')",
  "location_or_link": "string (e.g., 'Google Meet URL' or 'Placement Cell Lab 3')",
  "notes": "string",
  "created_at": "ISODate"
}
```

---

### Collection: `notifications`
Powers in-portal alerts for students and staff.
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (references users._id)",
  "title": "string",
  "message": "string",
  "type": "string (enum: 'job_alert' | 'application_status' | 'interview_schedule' | 'general')",
  "link": "string",
  "read": "boolean (default: false)",
  "created_at": "ISODate"
}
```

---

### Collection: `audit_logs`
Maintains immutable logs of sensitive administrative actions (status changes, job publishing, Excel exports).
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (references users._id)",
  "action": "string (e.g., 'UPDATE_APPLICATION_STATUS', 'EXPORT_EXCEL_REPORT')",
  "entity_type": "string (e.g., 'application', 'job')",
  "entity_id": "string",
  "details": "object",
  "timestamp": "ISODate"
}
```
