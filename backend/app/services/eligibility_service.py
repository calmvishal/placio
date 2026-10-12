from datetime import datetime, timezone
from typing import Dict, Any, List

def evaluate_student_eligibility(
    student_profile: Dict[str, Any],
    job: Dict[str, Any],
    already_applied: bool = False,
) -> Dict[str, Any]:
    """
    Deterministic, rule-based verification of student academic eligibility against company criteria.
    Never uses non-deterministic AI for rejection; produces transparent, auditable breakdown.
    """
    criteria: List[Dict[str, Any]] = []

    # 1. Graduation Passing Year / Batches Check
    eligible_batches = job.get("eligible_batches")
    if not eligible_batches:
        required_year = job.get("graduation_year", 2026)
        eligible_batches = [required_year] if required_year else [2026]
    else:
        eligible_batches = [int(b) for b in eligible_batches]

    try:
        student_year = int(student_profile.get("graduation_year", 2026))
    except (ValueError, TypeError):
        student_year = 2026

    year_passed = student_year in eligible_batches
    batches_str = ", ".join(map(str, sorted(eligible_batches)))
    criteria.append({
        "rule": "Graduation Batch",
        "passed": year_passed,
        "student_value": str(student_year),
        "required_value": batches_str,
        "message": (
            f"Graduation batch {student_year} matches eligible batches ({batches_str})."
            if year_passed
            else f"Graduation batch {student_year} does not match eligible batches: {batches_str}."
        ),
    })

    # 2. Branch / Department Check
    required_branches = job.get("required_branches", [])
    student_dept = (student_profile.get("department") or "CSE").strip().upper()
    if required_branches and len(required_branches) > 0:
        normalized_allowed = [b.strip().upper() for b in required_branches]
        branch_passed = student_dept in normalized_allowed
        criteria.append({
            "rule": "Department / Branch",
            "passed": branch_passed,
            "student_value": student_dept,
            "required_value": ", ".join(required_branches),
            "message": (
                f"Department '{student_dept}' is eligible."
                if branch_passed
                else f"Department '{student_dept}' is not in allowed branches: {', '.join(required_branches)}."
            ),
        })
    else:
        # All branches allowed
        criteria.append({
            "rule": "Department / Branch",
            "passed": True,
            "student_value": student_dept,
            "required_value": "All Branches",
            "message": "Open to all engineering departments.",
        })

    # 3. Minimum CGPA Check
    min_cgpa = float(job.get("min_cgpa", 0.0))
    student_cgpa = float(student_profile.get("cgpa", 0.0))
    cgpa_passed = student_cgpa >= min_cgpa
    criteria.append({
        "rule": "Minimum CGPA",
        "passed": cgpa_passed,
        "student_value": f"{student_cgpa:.2f}",
        "required_value": f"{min_cgpa:.2f}",
        "message": (
            f"Current CGPA {student_cgpa:.2f} meets requirement (min {min_cgpa:.2f})."
            if cgpa_passed
            else f"Current CGPA {student_cgpa:.2f} is below minimum requirement of {min_cgpa:.2f}."
        ),
    })

    # 4. Active Backlogs Policy
    max_backlogs = int(job.get("max_active_backlogs", 0))
    student_backlogs = int(student_profile.get("active_backlogs", 0))
    backlog_passed = student_backlogs <= max_backlogs
    criteria.append({
        "rule": "Active Backlogs Policy",
        "passed": backlog_passed,
        "student_value": str(student_backlogs),
        "required_value": f"Max {max_backlogs}",
        "message": (
            f"Active backlogs ({student_backlogs}) satisfies policy (maximum allowed: {max_backlogs})."
            if backlog_passed
            else f"Active backlogs ({student_backlogs}) exceeds maximum allowed ({max_backlogs})."
        ),
    })

    # 5. Class 10 Percentage (if specified)
    min_10 = job.get("min_tenth_percentage")
    if min_10 is not None and float(min_10) > 0:
        student_10 = float(student_profile.get("tenth_percentage", 0.0))
        tenth_passed = student_10 >= float(min_10)
        criteria.append({
            "rule": "Class 10 Percentage",
            "passed": tenth_passed,
            "student_value": f"{student_10:.1f}%",
            "required_value": f"Min {float(min_10):.1f}%",
            "message": (
                f"Class 10 score {student_10:.1f}% satisfies requirement."
                if tenth_passed
                else f"Class 10 score {student_10:.1f}% is below minimum {float(min_10):.1f}%."
            ),
        })

    # 6. Class 12 / Diploma Percentage (if specified)
    min_12 = job.get("min_twelfth_percentage")
    if min_12 is not None and float(min_12) > 0:
        student_12 = float(student_profile.get("twelfth_percentage", 0.0))
        twelfth_passed = student_12 >= float(min_12)
        criteria.append({
            "rule": "Class 12 / Diploma",
            "passed": twelfth_passed,
            "student_value": f"{student_12:.1f}%",
            "required_value": f"Min {float(min_12):.1f}%",
            "message": (
                f"Class 12 score {student_12:.1f}% satisfies requirement."
                if twelfth_passed
                else f"Class 12 score {student_12:.1f}% is below minimum {float(min_12):.1f}%."
            ),
        })

    # Evaluate Overall Eligibility
    is_eligible = all(c["passed"] for c in criteria)

    # Deadline enforcement
    deadline = job.get("application_deadline")
    now = datetime.now(timezone.utc)
    if isinstance(deadline, datetime):
        deadline_tz = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
        deadline_passed = now > deadline_tz
    else:
        deadline_passed = False

    is_published = job.get("status") == "published"
    can_apply = is_eligible and is_published and not deadline_passed and not already_applied

    return {
        "is_eligible": is_eligible,
        "can_apply": can_apply,
        "already_applied": already_applied,
        "deadline_passed": deadline_passed,
        "criteria": criteria,
    }
