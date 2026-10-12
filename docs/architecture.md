# System Architecture & Technical Defense

## 1. High-Level Architectural Pattern

The portal uses a modern **Decoupled Three-Tier Client-Server Architecture**:

1. **Presentation Layer (Frontend Client)**:
   - Built with **React 19** and **Vite**.
   - Handles client-side view rendering, optimistic state updates, and protected route management via React Router.
   - Communicates with the backend strictly via asynchronous REST API calls over JSON.

2. **Application / Business Logic Layer (Backend API)**:
   - Built with **FastAPI (Python 3.12)**.
   - Enforces Role-Based Access Control (RBAC), data validation via Pydantic v2 schemas, deterministic eligibility evaluation, file parsing, and Excel generation.
   - Encapsulates AI interactions behind an internal proxy service to shield API keys and enforce fallback mechanisms.

3. **Data Layer (Persistence & Object Storage)**:
   - **MongoDB Atlas** for document-oriented persistence.
   - Local or cloud storage for uploaded resume PDFs.

---

## 2. Core Viva Defense Questions & Answers

### Q1: Why use FastAPI instead of Flask or Django?
* **High Performance**: FastAPI is built on Starlette and Pydantic, running on the ASGI standard (`uvicorn`), offering performance on par with Go and Node.js.
* **Automatic OpenAPI/Swagger Documentation**: FastAPI automatically produces interactive API documentation (`/docs`), making testing and demonstration simple during project defense.
* **Type Safety & Data Validation**: Using Pydantic models ensures every incoming payload is validated before hitting business logic, preventing malformed inputs and data corruption.

### Q2: Why use MongoDB instead of SQL (MySQL/PostgreSQL)?
* **Hierarchical Student Profiles**: A student profile contains variable-length arrays of skills, past projects, internships, and certifications. In a relational database, this requires 4-5 joined tables. In MongoDB, these naturally fit as embedded documents.
* **Preserved Application Snapshots**: When a student applies for a job, their profile snapshot (CGPA, skills, resume version at time of application) is frozen into the application document. MongoDB document storage makes immutable snapshots straightforward without duplicating relational rows.

### Q3: Why is Eligibility Checking Rule-Based rather than AI-Powered?
* **Academic & Legal Transparency**: Recruitment decisions must be 100% deterministic and explainable. If a company mandates "CGPA >= 7.5 and active backlogs = 0", an LLM might hallucinate or produce non-deterministic scores.
* **Rule-Based Engine**: The system uses strict logical rules evaluated server-side. The student receives exact explanations (*"Ineligible: Active backlogs present (2)"*).
* **Role of AI**: AI is strictly an **advisory layer** (Resume keyword matching, skill gap discovery, resume formatting suggestions) to guide the student, never to unilaterally disqualify an applicant.

### Q4: How is Formula Injection (CSV/Excel Injection) prevented?
* When exporting user data (such as student names, projects, or addresses) to Microsoft Excel, malicious inputs starting with characters like `=`, `+`, `-`, or `@` can be interpreted by Excel as executable formulas or DDE commands.
* We sanitize all exported text strings: any untrusted text starting with formula trigger symbols is automatically escaped with a leading single quote (`'`), neutralizing executable commands in Excel.
