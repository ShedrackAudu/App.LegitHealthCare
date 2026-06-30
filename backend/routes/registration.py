from flask import Blueprint, request, jsonify, g, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, BioData, ScreeningYearBioData, QueueTracker, QueueEntry, AuditLog
from datetime import datetime
from sqlalchemy import func
from decorators import require_permission
from utils.ip import get_client_ip
from utils.notification_logic import trigger_registration_success_notification

registration_bp = Blueprint('registration', __name__)

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@registration_bp.route('/patient/<staff_id>', methods=['GET'])
@jwt_required()
def get_patient(staff_id):
    # Comprehensive search (always in the context's main bio_data)
    bind = get_bind()
    if not bind: 
        return jsonify({"error": "Invalid section context"}), 400
    
    clean_staff_id = staff_id.strip()
    year = request.args.get('year')
    search_type = request.args.get('search_type', 'general').lower()
    
    patient = None
    if search_type == 'pid':
        # Strictly search by patient_id (PID)
        if year:
            yearly_record = ScreeningYearBioData.query.filter_by(
                patient_id=clean_staff_id,
                screening_year=int(year)
            ).first()
        else:
            yearly_record = ScreeningYearBioData.query.filter_by(
                patient_id=clean_staff_id
            ).order_by(ScreeningYearBioData.screening_year.desc()).first()
            
        if yearly_record:
            patient = BioData.query.filter_by(staff_id=yearly_record.staff_id).first()
    else:
        # Strictly search by staff_id
        patient = BioData.query.filter(func.lower(BioData.staff_id) == func.lower(clean_staff_id)).first()
        
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
        
    # NEW: Pull patient_id from the specific screening record if year is provided,
    # otherwise fall back to most recent (for generic lookup)
    if year:
        yearly_record = ScreeningYearBioData.query.filter_by(
            staff_id=patient.staff_id, 
            screening_year=int(year)
        ).first()
    else:
        yearly_record = ScreeningYearBioData.query.filter_by(
            staff_id=patient.staff_id
        ).order_by(ScreeningYearBioData.screening_year.desc()).first()
        
    strict = request.args.get('strict', 'false').lower() == 'true'
    if strict and year and not yearly_record:
        return jsonify({"error": "Patient not registered for this screening year"}), 404
        
    patient_id = yearly_record.patient_id if yearly_record else None
    
    # Log view action in audit trail only if not a search lookup
    if not request.args.get('search_type'):
        try:
            AuditLog.log_action(
                action="View Patient Profile",
                resource=f"Patient:{patient.staff_id}",
                details={"screening_year": year, "source": "Registration/Directory"},
                commit=True
            )
        except Exception as audit_err:
            pass
        
    return jsonify({
        "staff_id": patient.staff_id,
        "patient_id": patient_id, # Added
        "first_name": patient.first_name,
        "middle_name": patient.middle_name,
        "last_name": patient.last_name,
        "department": patient.department,
        "gender": patient.gender,
        "dob": patient.dob.isoformat() if patient.dob else None,
        "age": patient.age,
        "phone": patient.phone,
        "email": patient.email,
        "race": patient.race,
        "nationality": patient.nationality,
        "passport_image": patient.passport_image
    }), 200

@registration_bp.route('/api/patients/upload-passport', methods=['POST'])
@require_permission('registration')
def upload_passport():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({"error": "Invalid file type. Only images (PNG, JPG, JPEG, GIF, WEBP) are allowed."}), 400
        
    import os
    import uuid
    from flask import current_app
    from werkzeug.utils import secure_filename
    
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'passports')
    os.makedirs(upload_folder, exist_ok=True)
    
    file_path = os.path.join(upload_folder, unique_filename)
    file.save(file_path)
    
    relative_url = f"/static/uploads/passports/{unique_filename}"
    return jsonify({"passport_image": relative_url}), 200

@registration_bp.route('/register-patient', methods=['POST'])
@require_permission('registration')
def register_patient():
    try:
        data = request.json
        bind = get_bind()
        if not bind: return jsonify({"error": "Invalid section context"}), 400
        
        screening_year = data.get('screening_year')
        staff_id = data.get('staff_id', '').strip()
        patient_id = data.get('patient_id') # Clinic ID for this year
        
        if not staff_id or not patient_id:
            return jsonify({"error": "Staff ID and Patient ID are required"}), 400

        # Check if patient already registered in this year
        existing_yearly = ScreeningYearBioData.query.filter_by(
            screening_year=screening_year, 
            staff_id=staff_id
        ).first()
        
        if existing_yearly:
            return jsonify({"error": "Patient already registered for this screening year"}), 400

        # Ensure Patient ID is unique for this year
        id_conflict = ScreeningYearBioData.query.filter_by(
            screening_year=screening_year,
            patient_id=patient_id
        ).first()
        if id_conflict:
            return jsonify({"error": f"Patient ID {patient_id} already issued for {screening_year}"}), 400

        # 1. Update/Create Comprehensive BioData
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        if not patient:
            patient = BioData(staff_id=staff_id)
            db.session.add(patient)
        
        # Update fields
        patient.first_name = data.get('first_name')
        patient.middle_name = data.get('middle_name')
        patient.last_name = data.get('last_name')
        patient.department = data.get('department')
        patient.gender = data.get('gender')
        if data.get('dob'):
            try:
                patient.dob = datetime.strptime(data['dob'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": f"Invalid date format: {data['dob']}. Expected YYYY-MM-DD"}), 400
        patient.age = data.get('age')
        patient.phone = data.get('phone')
        patient.email = data.get('email')
        patient.race = data.get('race')
        patient.nationality = data.get('nationality')
        if 'passport_image' in data:
            patient.passport_image = data.get('passport_image')

        # 2. Link to Screening Year
        # Flush to ensure BioData is available for FK constraint in some DBs
        db.session.flush()

        yearly_record = ScreeningYearBioData(
            screening_year=screening_year,
            patient_id=patient_id,
            staff_id=staff_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            department=patient.department,
            gender=patient.gender,
            age=patient.age
        )
        db.session.add(yearly_record)
        
        # New Queue System: Create entries for specific clinical departments
        # First, clean up any existing entries for this staff/year to prevent duplicates
        QueueEntry.query.filter_by(staff_id=staff_id, screening_year=screening_year).delete()
        
        for dept in ['Consultation', 'Audiometry', 'Spirometry', 'ECG']:
            # Auto-assign next queue number for this department and year
            max_num = db.session.query(func.max(QueueEntry.queue_number)).filter_by(
                department=dept, 
                screening_year=screening_year
            ).scalar() or 0
            
            q_entry = QueueEntry(
                staff_id=staff_id,
                screening_year=screening_year,
                department=dept,
                status='Waiting',
                queue_number=max_num + 1
            )
            db.session.add(q_entry)

        # Create Audit Log
        audit = AuditLog(
            user_id=get_jwt_identity(),
            action='Register Patient',
            resource=f"Patient:{staff_id}",
            details=f"Patient {patient.first_name} {patient.last_name} registered for year {screening_year}.",
            ip_address=get_client_ip()
        )
        db.session.add(audit)
        db.session.commit()
        
        # Emit Socket.IO event for real-time stats updates
        try:
            from extensions import socketio
            socketio.emit('patient_registered', {
                "screening_year": screening_year
            }, to='staff_events')
        except Exception as se:
            print(f"Failed to emit patient_registered event: {se}")
        
        # Trigger background email notification (Zero latency for the user)
        if patient.email and "@" in patient.email:
            trigger_registration_success_notification(patient.email, patient.first_name, screening_year)
        
        return jsonify({"message": "Registration successful", "staff_id": staff_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@registration_bp.route('/stats', methods=['GET'])
@require_permission('view_dashboard')
def get_registration_stats():
    bind = get_bind()
    year = request.args.get('year')
    if not bind or not year: return jsonify({"error": "Context missing"}), 400
    
    # Total in bio_data (Comprehensive)
    total_comprehensive = BioData.query.count()
    
    # Stats for the specific screening year
    base_query = ScreeningYearBioData.query.filter_by(screening_year=year)
    
    from datetime import time
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    # Number registered today
    day_count = base_query.filter(ScreeningYearBioData.created_at >= today_start, ScreeningYearBioData.created_at <= today_end).count()
    
    # Gender counts
    males = base_query.filter_by(gender='Male').count()
    females = base_query.filter_by(gender='Female').count()
    
    # Age breakdown
    age_40_above = base_query.filter(ScreeningYearBioData.age >= 40).count()
    age_below_40 = base_query.filter(ScreeningYearBioData.age < 40).count()
    
    # Department breakdown
    dept_counts_raw = db.session.query(
        ScreeningYearBioData.department,
        func.count(ScreeningYearBioData.id)
    ).filter_by(screening_year=year).group_by(ScreeningYearBioData.department).order_by(func.count(ScreeningYearBioData.id).desc()).all()
    
    dept_counts = [{"department": dept or "Unknown", "count": count} for dept, count in dept_counts_raw]
    
    # Daily breakdown for the specific screening year
    daily_counts_raw = db.session.query(
        func.date(ScreeningYearBioData.created_at),
        func.count(ScreeningYearBioData.id)
    ).filter_by(screening_year=year).group_by(func.date(ScreeningYearBioData.created_at)).order_by(func.date(ScreeningYearBioData.created_at).desc()).all()
    
    daily_stats = [{"date": str(d_date) if d_date else "Unknown", "count": count} for d_date, count in daily_counts_raw if count > 0]
    
    return jsonify({
        "total_comprehensive": total_comprehensive,
        "year_total": base_query.count(),
        "today": day_count,
        "males": males,
        "females": females,
        "age_40_above": age_40_above,
        "age_below_40": age_below_40,
        "department_stats": dept_counts,
        "daily_stats": daily_stats
    }), 200

@registration_bp.route('/download-registered', methods=['GET'])
@jwt_required()
def download_registered_excel():
    bind = get_bind()
    if not bind: 
        return jsonify({"error": "Invalid section context"}), 400
        
    year = request.args.get('year')
    if not year:
        return jsonify({"error": "Year is required"}), 400
        
    date_str = request.args.get('date') # Format: YYYY-MM-DD
    
    query = db.session.query(
        ScreeningYearBioData, BioData
    ).join(
        BioData, 
        ScreeningYearBioData.staff_id == BioData.staff_id
    ).filter(
        ScreeningYearBioData.screening_year == int(year)
    )
    
    if date_str:
        from datetime import datetime, time
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_start = datetime.combine(target_date, time.min)
            day_end = datetime.combine(target_date, time.max)
            query = query.filter(
                ScreeningYearBioData.created_at >= day_start,
                ScreeningYearBioData.created_at <= day_end
            )
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
            
    records = query.order_by(
        ScreeningYearBioData.department.asc(),
        ScreeningYearBioData.last_name.asc(),
        ScreeningYearBioData.first_name.asc()
    ).all()
    
    import pandas as pd
    import io
    
    download_filename = f"Registered_Patients_{year}_{date_str}.xlsx" if date_str else f"Registered_Patients_{year}.xlsx"
    
    if not records:
        output = io.BytesIO()
        df = pd.DataFrame(columns=["Staff ID", "Patient ID", "First Name", "Middle Name", "Last Name", "Department", "Gender", "Age", "Phone", "Email", "Race", "Nationality"])
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='No Registrations')
        output.seek(0)
        return send_file(output, download_name=download_filename, as_attachment=True)
        
    data_list = []
    for yr, bio in records:
        data_list.append({
            "Staff ID": yr.staff_id,
            "Patient ID": yr.patient_id,
            "First Name": yr.first_name,
            "Middle Name": bio.middle_name or "",
            "Last Name": yr.last_name,
            "Department": yr.department or "Unknown",
            "Gender": yr.gender,
            "Age": yr.age,
            "Phone": bio.phone or "N/A",
            "Email": bio.email or "N/A",
            "Race": bio.race or "N/A",
            "Nationality": bio.nationality or "N/A",
            "Registration Date": yr.created_at.strftime('%Y-%m-%d %H:%M') if yr.created_at else "N/A"
        })
        
    df_all = pd.DataFrame(data_list)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        workbook = writer.book
        
        # 1. Create a Department Summary Sheet with a chart
        dept_counts = df_all["Department"].value_counts().reset_index()
        dept_counts.columns = ["Department", "Patient Count"]
        total_patients = len(df_all)
        dept_counts["Percentage"] = (dept_counts["Patient Count"] / total_patients)
        
        dept_counts.to_excel(writer, sheet_name="Department Summary", index=False)
        worksheet_summary = writer.sheets["Department Summary"]
        
        # Formatting for summary sheet
        header_format = workbook.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'fg_color': '#008080',
            'font_color': 'white',
            'border': 1
        })
        
        percent_format = workbook.add_format({'num_format': '0.0%'})
        
        # Rewrite headers & format columns
        for col_num, value in enumerate(dept_counts.columns.values):
            worksheet_summary.write(0, col_num, value, header_format)
            max_len = max(dept_counts[value].astype(str).map(len).max(), len(value)) + 3
            worksheet_summary.set_column(col_num, col_num, max_len)
            
        # Format the percentage column
        worksheet_summary.set_column(2, 2, 12, percent_format)
        
        # Add total row to summary
        total_row_idx = len(dept_counts) + 1
        worksheet_summary.write(total_row_idx, 0, "Total", workbook.add_format({'bold': True}))
        worksheet_summary.write(total_row_idx, 1, f"=SUM(B2:B{total_row_idx})", workbook.add_format({'bold': True}))
        worksheet_summary.write(total_row_idx, 2, f"=SUM(C2:C{total_row_idx})", workbook.add_format({'bold': True, 'num_format': '0.0%'}))
        
        # Create a Pie Chart to display percentages
        chart = workbook.add_chart({'type': 'pie'})
        chart.add_series({
            'name': 'Department Distribution',
            'categories': f"='Department Summary'!$A$2:$A${total_row_idx}",
            'values':     f"='Department Summary'!$C$2:$C${total_row_idx}",
            'data_labels': {'percentage': True, 'leader_lines': True},
        })
        chart.set_title({'name': 'Registered Patients by Department (%)'})
        chart.set_style(10)
        worksheet_summary.insert_chart('E2', chart, {'x_offset': 25, 'y_offset': 10})
        
        # 2. Write the details sheet
        df_all.to_excel(writer, sheet_name="All Registered", index=False)
        worksheet_all = writer.sheets["All Registered"]
        
        for col_num, value in enumerate(df_all.columns.values):
            worksheet_all.write(0, col_num, value, header_format)
            max_len = max(df_all[value].astype(str).map(len).max(), len(value)) + 3
            worksheet_all.set_column(col_num, col_num, max_len)
            
        # 3. Write individual department sheets
        departments = df_all["Department"].unique()
        for dept in departments:
            sheet_title = str(dept)[:30]
            df_dept = df_all[df_all["Department"] == dept]
            df_dept.to_excel(writer, sheet_name=sheet_title, index=False)
            
            worksheet_dept = writer.sheets[sheet_title]
            for col_num, value in enumerate(df_dept.columns.values):
                worksheet_dept.write(0, col_num, value, header_format)
                max_len = max(df_dept[value].astype(str).map(len).max(), len(value)) + 3
                worksheet_dept.set_column(col_num, col_num, max_len)
                
    output.seek(0)
    return send_file(
        output, 
        download_name=download_filename, 
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@registration_bp.route('/department-patients', methods=['GET'])
@require_permission('registration')
def get_department_patients():
    bind = get_bind()
    if not bind:
        return jsonify({"error": "Invalid section context"}), 400
        
    year = request.args.get('year')
    department = request.args.get('department')
    if not year or not department:
        return jsonify({"error": "Year and department are required"}), 400
        
    if department == "Unknown":
        patients = ScreeningYearBioData.query.filter(
            ScreeningYearBioData.screening_year == int(year),
            (ScreeningYearBioData.department == None) | (ScreeningYearBioData.department == "")
        ).order_by(ScreeningYearBioData.last_name.asc(), ScreeningYearBioData.first_name.asc()).all()
    else:
        patients = ScreeningYearBioData.query.filter_by(
            screening_year=int(year),
            department=department
        ).order_by(ScreeningYearBioData.last_name.asc(), ScreeningYearBioData.first_name.asc()).all()
        
    result = []
    for p in patients:
        result.append({
            "id": p.id,
            "staff_id": p.staff_id,
            "patient_id": p.patient_id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "department": p.department or "Unknown",
            "gender": p.gender,
            "age": p.age,
            "created_at": p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else "N/A"
        })
        
    return jsonify(result), 200

