import io
from datetime import datetime, timezone
from typing import List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def sanitize_cell_value(val: Any) -> Any:
    """
    Neutralize CSV / Excel formula injection.
    Prefix strings that start with formula trigger characters (=, +, -, @)
    with a single apostrophe (') so spreadsheet software treats them as literal text.
    """
    if isinstance(val, str):
        trimmed = val.strip()
        if trimmed.startswith(("=", "+", "-", "@", "\t", "\r")):
            return f"'{trimmed}"
    return val

def generate_applicants_excel(job: Dict[str, Any], applications: List[Dict[str, Any]]) -> io.BytesIO:
    """
    Generates a genuine Microsoft Excel (.xlsx) workbook for placement drive applicants.
    Features:
    - Formula injection defense
    - Frozen header pane
    - Clean typography and professional styling
    - Auto-adjusted column widths
    - Academic numerical formatting
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Applicants Roster"
    ws.views.sheetView[0].showGridLines = True

    # Styling Palettes
    navy_header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    zebra_even_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    
    font_title = Font(name="Segoe UI", size=14, bold=True, color="0F172A")
    font_subtitle = Font(name="Segoe UI", size=9, bold=False, color="475569")
    font_header = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    font_body = Font(name="Segoe UI", size=10, color="1E293B")
    font_bold_body = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    
    border_thin = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(top=border_thin, left=border_thin, right=border_thin, bottom=border_thin)

    # 1. Title Block (Rows 1-3)
    company_name = job.get("company_name", "Company")
    job_title = job.get("title", "Position")
    ctc = job.get("salary_package", "Disclosed in interview")
    job_type = job.get("job_type", "Full-Time")
    work_mode = job.get("work_mode", "On-site")
    now_str = datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M UTC")

    ws.merge_cells("A1:M1")
    title_cell = ws["A1"]
    title_cell.value = f"{company_name} — {job_title} Recruitment Pipeline"
    title_cell.font = font_title
    title_cell.alignment = Alignment(vertical="center")

    ws.merge_cells("A2:M2")
    sub1_cell = ws["A2"]
    sub1_cell.value = f"CTC Package: {ctc}  |  Job Type: {job_type}  |  Work Mode: {work_mode}  |  Min CGPA: {job.get('min_cgpa', 0.0)}  |  Batch: {job.get('graduation_year', 'All')}"
    sub1_cell.font = font_subtitle
    sub1_cell.alignment = Alignment(vertical="center")

    ws.merge_cells("A3:M3")
    sub2_cell = ws["A3"]
    sub2_cell.value = f"Export Generated: {now_str}  |  Total Filtered Applicants: {len(applications)}  |  Exported by TPO Placement Cell"
    sub2_cell.font = font_subtitle
    sub2_cell.alignment = Alignment(vertical="center")

    # Row 4 is blank separator
    ws.row_dimensions[1].height = 25
    ws.row_dimensions[2].height = 18
    ws.row_dimensions[3].height = 18
    ws.row_dimensions[4].height = 10

    # 2. Table Column Headers (Row 5)
    headers = [
        "S.No",
        "Student Name",
        "Roll Number",
        "College Email",
        "Department",
        "CGPA",
        "10th %",
        "12th %",
        "Backlogs",
        "Technical Skills",
        "Recruitment Stage",
        "Applied Date",
        "Latest Evaluation Notes",
    ]

    ws.row_dimensions[5].height = 26
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=5, column=col_idx)
        cell.value = header
        cell.font = font_header
        cell.fill = navy_header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = cell_border

    # 3. Data Rows (Row 6 onwards)
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    for idx, app in enumerate(applications, 1):
        row_num = 5 + idx
        ws.row_dimensions[row_num].height = 20
        snap = app.get("student_snapshot", {})
        
        # Format values
        skills_str = ", ".join(snap.get("skills", [])) if snap.get("skills") else "None specified"
        applied_at = app.get("applied_at")
        applied_str = applied_at.strftime("%Y-%m-%d %H:%M") if isinstance(applied_at, datetime) else str(applied_at)[:16]
        
        # Get latest notes from history
        history = app.get("status_history", [])
        latest_notes = history[-1].get("notes", "") if history else ""

        row_data = [
            (idx, align_center, False),
            (sanitize_cell_value(snap.get("full_name", "N/A")), align_left, True),
            (sanitize_cell_value(snap.get("roll_number", "N/A")), align_center, False),
            (sanitize_cell_value(snap.get("email", "N/A")), align_left, False),
            (sanitize_cell_value(snap.get("department", "N/A")), align_center, False),
            (snap.get("cgpa", 0.0), align_right, False),
            (snap.get("tenth_percentage", 0.0), align_right, False),
            (snap.get("twelfth_percentage", 0.0), align_right, False),
            (snap.get("active_backlogs", 0), align_center, False),
            (sanitize_cell_value(skills_str), align_left, False),
            (sanitize_cell_value(app.get("status", "Applied")), align_center, True),
            (applied_str, align_center, False),
            (sanitize_cell_value(latest_notes), align_left, False),
        ]

        # Alternating background
        is_even = idx % 2 == 0

        for col_idx, (val, alignment, is_bold) in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.value = val
            cell.font = font_bold_body if is_bold else font_body
            cell.alignment = alignment
            cell.border = cell_border
            if is_even:
                cell.fill = zebra_even_fill

            # Numerical number formats
            if col_idx == 6:  # CGPA
                cell.number_format = "0.00"
            elif col_idx in (7, 8):  # Percentages
                cell.number_format = '0.0"%"'

    # 4. Freeze Panes: Pin table headers so rows 1-5 remain visible on vertical scroll
    ws.freeze_panes = "A6"

    # 5. Auto-calculate readable column widths
    col_min_max = {
        1: (6, 8),     # S.No
        2: (18, 28),   # Student Name
        3: (14, 18),   # Roll Number
        4: (24, 34),   # Email
        5: (12, 16),   # Department
        6: (10, 12),   # CGPA
        7: (10, 12),   # 10th %
        8: (10, 12),   # 12th %
        9: (10, 12),   # Backlogs
        10: (22, 40),  # Skills
        11: (16, 22),  # Status
        12: (18, 22),  # Applied Date
        13: (25, 45),  # Notes
    }

    for col_idx in range(1, len(headers) + 1):
        col_letter = get_column_letter(col_idx)
        min_w, max_w = col_min_max.get(col_idx, (12, 30))
        # Find longest string in column
        max_len = len(headers[col_idx - 1])
        for row in range(6, 6 + len(applications)):
            val = str(ws.cell(row=row, column=col_idx).value or "")
            if len(val) > max_len:
                max_len = len(val)
        computed_w = max(min_w, min(max_len + 3, max_w))
        ws.column_dimensions[col_letter].width = computed_w

    output_stream = io.BytesIO()
    wb.save(output_stream)
    output_stream.seek(0)
    return output_stream

def generate_bulk_import_template() -> io.BytesIO:
    """
    Generates a pre-formatted Excel template for bulk importing student candidates.
    Includes column headers, formatting, instructions, and sample rows.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Student Import Template"
    ws.views.sheetView[0].showGridLines = True

    # Styling Palettes
    navy_header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    font_header = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    font_body = Font(name="Segoe UI", size=10, color="1E293B")
    border_thin = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(top=border_thin, left=border_thin, right=border_thin, bottom=border_thin)

    headers = [
        "Full Name *",
        "Email *",
        "Roll Number *",
        "Department *",
        "Branch",
        "Graduation Year *",
        "CGPA",
        "10th Percentage",
        "12th Percentage",
        "Phone",
        "Initial Password",
    ]

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = font_header
        cell.fill = navy_header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = cell_border
    ws.row_dimensions[1].height = 28

    sample_rows = [
        [
            "Aarav Sharma",
            "aarav.sharma@college.edu",
            "22CS101",
            "CSE",
            "Computer Science & Engineering",
            2026,
            8.75,
            92.5,
            89.0,
            "9876543210",
            "Placio@2026",
        ],
        [
            "Priya Patel",
            "priya.patel@college.edu",
            "22IT102",
            "IT",
            "Information Technology",
            2026,
            9.10,
            95.0,
            93.5,
            "9876543211",
            "Placio@2026",
        ],
        [
            "Rohan Verma",
            "rohan.verma@college.edu",
            "22EC103",
            "ECE",
            "Electronics & Communication",
            2026,
            7.80,
            85.0,
            82.0,
            "9876543212",
            "Placio@2026",
        ],
    ]

    for row_idx, row_data in enumerate(sample_rows, 2):
        ws.row_dimensions[row_idx].height = 22
        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=sanitize_cell_value(val))
            cell.font = font_body
            cell.border = cell_border
            if col_idx in [6, 7, 8, 9]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    col_widths = {
        1: 22,  # Name
        2: 28,  # Email
        3: 16,  # Roll
        4: 14,  # Dept
        5: 30,  # Branch
        6: 18,  # Batch
        7: 12,  # CGPA
        8: 16,  # 10th
        9: 16,  # 12th
        10: 16, # Phone
        11: 18, # Password
    }

    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    output_stream = io.BytesIO()
    wb.save(output_stream)
    output_stream.seek(0)
    return output_stream

