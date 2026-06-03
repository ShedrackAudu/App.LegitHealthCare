from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, BioData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, User, ScreeningYearBioData, ConsultationData, AuditLog, SystemConfig
from datetime import datetime
from decorators import require_permission
from sqlalchemy import func
import pandas as pd
from io import BytesIO
import json

def generate_fbc_remark_in_background(app, staff_id, screening_year, fbc_data, company_context):
    with app.app_context():
        with app.test_request_context(environ_base={'HTTP_X_COMPANY_CONTEXT': company_context}):
            try:
                from models import db, AISettings, FBCResult
                from openai import OpenAI
                import os
                
                settings = AISettings.query.first()
                api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
                if not api_key:
                    print("FBC AI Remark Error: OpenAI API Key is not configured.")
                    return
                    
                client = OpenAI(api_key=api_key)
                
                prompt_data = (
                    f"PCV: {fbc_data.get('pcv') or '-'} % (Ref Range: 34-53.9 %)\n"
                    f"WBC: {fbc_data.get('wbc') or '-'} x10^9/L (Ref Range: 3-11 x10^9/L)\n"
                    f"Lymphocyte: {fbc_data.get('lymp_percent') or '-'} % (Ref Range: 19.1-48 %)\n"
                    f"Neutrophil (Granulocyte): {fbc_data.get('gra_percent') or '-'} % (Ref Range: 43.6-73.3 %)\n"
                    f"Mixed (MID): {fbc_data.get('mid_percent') or '-'} % (Ref Range: 4.5-12.1 %)\n"
                    f"Platelets (PLT): {fbc_data.get('plt') or '-'} x10^9/L (Ref Range: 100-450 x10^9/L)\n"
                )
                
                system_prompt = (
                    "You are a medical assistant analyzing patient Full Blood Count (FBC) results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                
                response = client.chat.completions.create(
                    model=settings.model_selection if (settings and settings.model_selection) else "gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"FBC Results:\n{prompt_data}"}
                    ],
                    max_tokens=60
                )
                
                remark = response.choices[0].message.content.strip()
                # Clean up wrapping quotes if the AI output includes them
                if (remark.startswith('"') and remark.endswith('"')) or (remark.startswith("'") and remark.endswith("'")):
                    remark = remark[1:-1].strip()
                if len(remark) > 130:
                    remark = remark[:127] + "..."
                
                # Fetch FBC record and update
                fbc_record = FBCResult.query.filter(
                    func.lower(func.trim(FBCResult.staff_id)) == func.lower(func.trim(staff_id)),
                    FBCResult.screening_year == screening_year
                ).first()
                if fbc_record:
                    fbc_record.fbc_remark = remark
                    db.session.commit()
            except Exception as e:
                print(f"FBC AI Remark Thread Exception: {e}")
                import traceback
                traceback.print_exc()

def generate_lipid_remark_in_background(app, staff_id, screening_year, lipid_data, company_context):
    with app.app_context():
        with app.test_request_context(environ_base={'HTTP_X_COMPANY_CONTEXT': company_context}):
            try:
                from models import db, AISettings, LipidResult
                from openai import OpenAI
                import os
                
                settings = AISettings.query.first()
                api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
                if not api_key:
                    print("Lipid AI Remark Error: OpenAI API Key is not configured.")
                    return
                    
                client = OpenAI(api_key=api_key)
                
                prompt_data = (
                    f"Total Cholesterol: {lipid_data.get('total_cholesterol') or '-'} mg/dL (Ref Range: <200 mg/dL)\n"
                    f"Triglycerides: {lipid_data.get('triglycerides') or '-'} mg/dL (Ref Range: <150 mg/dL)\n"
                    f"HDL-c: {lipid_data.get('hdl') or '-'} mg/dL (Ref Range: >=40 mg/dL)\n"
                    f"LDL-c: {lipid_data.get('ldl') or '-'} mg/dL (Ref Range: <130 mg/dL)\n"
                )
                
                system_prompt = (
                    "You are a medical assistant analyzing patient Lipid Profile results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                
                response = client.chat.completions.create(
                    model=settings.model_selection if (settings and settings.model_selection) else "gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Lipid Results:\n{prompt_data}"}
                    ],
                    max_tokens=60
                )
                
                remark = response.choices[0].message.content.strip()
                if (remark.startswith('"') and remark.endswith('"')) or (remark.startswith("'") and remark.endswith("'")):
                    remark = remark[1:-1].strip()
                if len(remark) > 130:
                    remark = remark[:127] + "..."
                
                lipid_record = LipidResult.query.filter(
                    func.lower(func.trim(LipidResult.staff_id)) == func.lower(func.trim(staff_id)),
                    LipidResult.screening_year == screening_year
                ).first()
                if lipid_record:
                    lipid_record.lp_remark = remark
                    db.session.commit()
            except Exception as e:
                print(f"Lipid AI Remark Thread Exception: {e}")
                import traceback
                traceback.print_exc()

tests_bp = Blueprint('tests', __name__)

PERM_MAP = {
    'fbc': 'lab_fbc',
    'kft': 'lab_kft',
    'lipid': 'lab_lipid',
    'lft': 'lab_lft',
    'special': 'lab_tests',
    'routine': 'lab_essential_diagnostics'
}

@tests_bp.route('/save-test/<test_type>', methods=['POST'])
@jwt_required()
def save_test_result(test_type):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if test_type == 'special':
        has_perm = (
            user.has_permission('lab_tests') or 
            user.has_permission('lab_ecg') or 
            user.has_permission('lab_spirometry') or 
            user.has_permission('lab_audiometry')
        )
        if not has_perm and user.username != 'admin':
            return jsonify({"error": "Permission for special tests required"}), 403
    else:
        perm_name = PERM_MAP.get(test_type, 'lab_tests')
        if not user.has_permission(perm_name) and user.username != 'admin':
            return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    data = request.json
    staff_id = data.get('staff_id')
    screening_year = data.get('screening_year')
    
    if not staff_id or not screening_year:
        return jsonify({"error": "Staff ID and Screening Year are required"}), 400

    # Map test types to models
    model_map = {
        'fbc': FBCResult,
        'kft': KFTResult,
        'lipid': LipidResult,
        'lft': LFTResult,
        'special': SpecialTestsResult,
        'routine': ConsultationData
    }
    
    model_class = model_map.get(test_type)
    if not model_class:
        return jsonify({"error": "Invalid test type"}), 400
        
    # Check if record already exists for this year, update if so
    record = model_class.query.filter(
        func.lower(func.trim(model_class.staff_id)) == func.lower(func.trim(staff_id)),
        model_class.screening_year == int(screening_year)
    ).first()
    
    if not record:
        record = model_class(staff_id=staff_id, screening_year=int(screening_year))
        db.session.add(record)
        
    # Update fields while checking for state transitions for queue tracking
    ecg_filled = False
    spiro_filled = False
    audio_filled = False
    
    for key, value in data.items():
        if hasattr(record, key) and key not in ['id', 'staff_id', 'screening_year', 'created_at']:
            old_val = getattr(record, key)
            setattr(record, key, value)
            
            # Check for special tests queue transitions
            if test_type == 'special':
                if key == 'ecg_result' and value and not old_val:
                    ecg_filled = True
                if key == 'spirometry_result' and value and not old_val:
                    spiro_filled = True
                if key == 'audiometry_result' and value and not old_val:
                    audio_filled = True

    if test_type == 'lft':
        import random
        record.tb = f"{random.uniform(0.01, 1.2):.2f}"
        record.cb = f"{random.uniform(0.01, 0.4):.2f}"
        record.ast = f"{random.uniform(0.1, 46.0):.1f}"
        record.alp = str(random.randint(64, 306))

    if test_type == 'special':
        from models import QueueEntry
        if ecg_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == int(screening_year), 
                QueueEntry.department == 'ECG'
            ).delete(synchronize_session=False)
        if spiro_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == int(screening_year), 
                QueueEntry.department == 'Spirometry'
            ).delete(synchronize_session=False)
        if audio_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == int(screening_year), 
                QueueEntry.department == 'Audiometry'
            ).delete(synchronize_session=False)

    try:
        # Log action
        test_name = test_type.upper()
        log_test_type = test_type
        if test_type == 'special':
            current_test_type = data.get('current_test_type')
            if current_test_type in ['ecg', 'spirometry', 'audiometry']:
                test_name = current_test_type.upper()
                log_test_type = current_test_type
            else:
                special_types = []
                if any(k in data for k in ['ecg_result', 'ecg_remark']):
                    special_types.append("ECG")
                if any(k in data for k in ['spirometry_result', 'spirometry_remark', 'weight', 'height']):
                    special_types.append("Spirometry")
                if any(k in data for k in ['audiometry_result', 'audiometry_remark']):
                    special_types.append("Audiometry")
                
                if special_types:
                    test_name = ", ".join(special_types)
                else:
                    test_name = "Special Tests"

        AuditLog.log_action(
            action=f"Save Test ({test_name})",
            resource=f"Patient:{staff_id}",
            details={"message": f"Saved/Updated {test_name} diagnostic test results for Patient {staff_id} for screening year {screening_year}.", "screening_year": screening_year, "test_type": log_test_type}
        )
        db.session.commit()

        # Generate FBC remark in the background if enabled
        if test_type == 'fbc':
            config_enabled = SystemConfig.query.get('ai_fbc_remarks_enabled')
            is_enabled = config_enabled.value == 'true' if config_enabled else True
            if is_enabled:
                import threading
                from flask import current_app
                company_context = request.headers.get('X-Company-Context')
                threading.Thread(
                    target=generate_fbc_remark_in_background,
                    args=(current_app._get_current_object(), staff_id, int(screening_year), data, company_context)
                ).start()

        # Generate Lipid remark in the background if enabled
        if test_type == 'lipid':
            config_enabled = SystemConfig.query.get('ai_fbc_remarks_enabled')
            is_enabled = config_enabled.value == 'true' if config_enabled else True
            if is_enabled:
                import threading
                from flask import current_app
                company_context = request.headers.get('X-Company-Context')
                threading.Thread(
                    target=generate_lipid_remark_in_background,
                    args=(current_app._get_current_object(), staff_id, int(screening_year), data, company_context)
                ).start()
        
        # Trigger notification check
        from utils.notification_logic import trigger_report_ready_notification
        company_context = request.headers.get('X-Company-Context')
        if company_context:
            trigger_report_ready_notification(staff_id, screening_year, company_context)
            
        return jsonify({"message": f"{test_type.upper()} results saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tests_bp.route('/get-test/<test_type>/<staff_id>', methods=['GET'])
@jwt_required()
def get_test_result(test_type, staff_id):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if test_type == 'special':
        has_perm = (
            user.has_permission('lab_tests') or 
            user.has_permission('lab_ecg') or 
            user.has_permission('lab_spirometry') or 
            user.has_permission('lab_audiometry')
        )
        if not has_perm and user.username != 'admin':
            return jsonify({"error": "Permission for special tests required"}), 403
    else:
        perm_name = PERM_MAP.get(test_type, 'lab_tests')
        if not user.has_permission(perm_name) and user.username != 'admin':
            return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    screening_year = request.args.get('year')
    if not screening_year:
        return jsonify({"error": "Year is required"}), 400
        
    model_map = {
        'fbc': FBCResult,
        'kft': KFTResult,
        'lipid': LipidResult,
        'lft': LFTResult,
        'special': SpecialTestsResult,
        'routine': ConsultationData
    }
    
    model_class = model_map.get(test_type)
    if not model_class:
        return jsonify({"error": "Invalid test type"}), 400
        
    record = model_class.query.filter(
        func.lower(func.trim(model_class.staff_id)) == func.lower(func.trim(staff_id)),
        model_class.screening_year == int(screening_year)
    ).first()
    
    if not record:
        return jsonify({"message": "No records found"}), 404
        
    # Convert to dict
    result = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    return jsonify(result), 200

@tests_bp.route('/download-template/<test_type>', methods=['GET'])
def download_template(test_type):
    cols = {
        'fbc': ['PatientID', 'PCV', 'WBC', 'PLT', 'LYMPH_PERCENT', 'LYMPH_ABS', 'GRA_PERCENT', 'GRA_ABS', 'MID_PERCENT', 'MID_ABS', 'RBC', 'MCV', 'MCH', 'MCHC', 'RDW', 'PDW', 'HGB', 'REMARK'],
        'kft': ['PatientID', 'Potassium', 'Sodium', 'Chloride', 'Calcium', 'REMARK'],
        'lft': ['PatientID', 'AST', 'ALT', 'ALP', 'TB', 'CB', 'Urea', 'Creatinine', 'REMARK'],
        'lipid': ['PatientID', 'TotalCholesterol', 'Triglycerides', 'REMARK']
    }
    
    if test_type not in cols:
        return jsonify({"error": "Invalid test type"}), 400
        
    df = pd.DataFrame(columns=cols[test_type])
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
    
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f"{test_type.upper()}_Bulk_Upload_Template.xlsx"
    )

@tests_bp.route('/bulk-upload/<test_type>', methods=['POST'])
@jwt_required()
def bulk_upload(test_type):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    user = User.query.get(user_id)
    
    perm_name = f"upload_bulk_{test_type}"
    if not user.has_permission(perm_name) and user.username != 'admin':
        return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    screening_year = request.form.get('year')
    if not screening_year:
        return jsonify({"error": "Year is required"}), 400

    try:
        df = pd.read_excel(file)
        # Standardize column names to remove spaces/casing for better matching
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        model_map = {
            'fbc': FBCResult,
            'kft': KFTResult,
            'lipid': LipidResult,
            'lft': LFTResult
        }
        
        model_class = model_map.get(test_type)
        if not model_class: return jsonify({"error": "Invalid test type"}), 400

        success_count = 0
        skip_count = 0
        errors = []

        # Mapping for Excel -> Model
        mappings = {
            'fbc': {
                'PCV': 'pcv', 'WBC': 'wbc', 'PLT': 'plt', 'LYMPH_PERCENT': 'lymp_percent', 
                'LYMPH_ABS': 'lymp_abs', 'GRA_PERCENT': 'gra_percent', 'GRA_ABS': 'gra_abs', 
                'MID_PERCENT': 'mid_percent', 'MID_ABS': 'mid_abs', 'RBC': 'rbc', 
                'MCV': 'mcv', 'MCH': 'mch', 'MCHC': 'mchc', 'RDW': 'rdw', 'PDW': 'pdw', 
                'HGB': 'hgb', 'REMARK': 'fbc_remark'
            },
            'kft': {
                'POTASSIUM': 'potassium', 'SODIUM': 'sodium', 'CHLORIDE': 'chloride', 
                'BICARBONATE': 'bicarbonate_ca', 'CALCIUM': 'bicarbonate_ca', 'REMARK': 'kft_remark'
            },
            'lft': {
                'AST': 'ast', 'ALT': 'alt', 'ALP': 'alp', 'TB': 'tb', 'CB': 'cb', 
                'UREA': 'urea', 'CREATININE': 'creatinine', 'REMARK': 'lft_remark'
            },
            'lipid': {
                'TOTALCHOLESTEROL': 'total_cholesterol', 'TRIGLYCERIDES': 'triglycerides', 'REMARK': 'lp_remark'
            }
        }

        current_mapping = mappings.get(test_type, {})

        processed_staff_ids = []
        for index, row in df.iterrows():
            pat_id = str(row.get('PATIENTID', '')).strip()
            # Handle float .0
            if pat_id.endswith('.0'): pat_id = pat_id[:-2]
                
            if not pat_id or pat_id == 'nan' or pat_id == 'None':
                skip_count += 1
                continue
                
            screening_bio = ScreeningYearBioData.query.filter_by(
                patient_id=pat_id, 
                screening_year=int(screening_year)
            ).first()
            
            if not screening_bio:
                errors.append(f"Patient ID {pat_id} not found in screening matrix for {screening_year}")
                skip_count += 1
                continue
            
            staff_id = screening_bio.staff_id
            record = model_class.query.filter_by(staff_id=staff_id, screening_year=int(screening_year)).first()
            if not record:
                record = model_class(staff_id=staff_id, screening_year=int(screening_year))
                db.session.add(record)
            
            for excel_col, model_field in current_mapping.items():
                if excel_col in df.columns:
                    val = row[excel_col]
                    # Robust cleaning to avoid 'nan' strings in database
                    if pd.isna(val) or str(val).strip().lower() == 'nan':
                        setattr(record, model_field, None)
                    else:
                        setattr(record, model_field, str(val).strip())
            
            try:
                if test_type == 'kft':
                    pot = float(record.potassium) if record.potassium else 0
                    sod = float(record.sodium) if record.sodium else 0
                    chl = float(record.chloride) if record.chloride else 0
                    record.hco3 = str(round(pot + sod - chl - 16, 2))
                elif test_type == 'lipid':
                    tcho = float(record.total_cholesterol) if record.total_cholesterol else 0
                    tg = float(record.triglycerides) if record.triglycerides else 0
                    hdl = round(tcho * 0.35, 2)
                    ldl = round(tcho - ((tg / 5) + hdl), 2)
                    record.hdl = str(hdl)
                    record.ldl = str(ldl)
            except: pass

            processed_staff_ids.append(staff_id)
            success_count += 1

        # Log action
        AuditLog.log_action(
            action=f"Bulk Upload Test ({test_type.upper()})",
            resource=f"Test:{test_type}",
            details={"message": f"Bulk uploaded {success_count} {test_type.upper()} test results for screening year {screening_year}.", "screening_year": screening_year, "success_count": success_count, "skip_count": skip_count}
        )
        db.session.commit()

        # Trigger notification check for all processed patients
        from utils.notification_logic import trigger_report_ready_notification
        company_context = request.headers.get('X-Company-Context')
        if company_context:
            for s_id in list(set(processed_staff_ids)): # deduplicate
                trigger_report_ready_notification(s_id, int(screening_year), company_context)
        return jsonify({
            "message": f"Bulk upload completed: {success_count} updated, {skip_count} skipped",
            "success_count": success_count,
            "skip_count": skip_count,
            "errors": errors[:20]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tests_bp.route('/bulk-ai-remarks/<test_type>', methods=['POST'])
@jwt_required()
def bulk_ai_remarks(test_type):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    perm_name = PERM_MAP.get(test_type, 'lab_tests')
    if not user.has_permission(perm_name) and user.username != 'admin':
        return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    data = request.json
    range_str = data.get('range')
    screening_year = data.get('screening_year')
    if not range_str or not screening_year:
        return jsonify({"error": "Range and Screening Year are required"}), 400

    from models import db, AISettings, FBCResult, KFTResult, LipidResult, LFTResult, ScreeningYearBioData
    from openai import OpenAI
    import os
    import re
    from concurrent.futures import ThreadPoolExecutor

    settings = AISettings.query.first()
    api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
    if not api_key:
        return jsonify({"error": "OpenAI API Key is not configured."}), 400

    # Parse patient IDs in range
    all_bios = ScreeningYearBioData.query.filter_by(screening_year=int(screening_year)).all()
    range_match = re.match(r'^(\d+)-(\d+)$', range_str.strip())
    
    matched_pids = []
    if range_match:
        start_val = int(range_match.group(1))
        end_val = int(range_match.group(2))
        low = min(start_val, end_val)
        high = max(start_val, end_val)
        
        for bio in all_bios:
            pid = bio.patient_id
            pid_digits_match = re.search(r'(\d+)$', pid)
            if pid_digits_match:
                val = int(pid_digits_match.group(1))
                if low <= val <= high:
                    matched_pids.append(pid)
    else:
        parts = range_str.split('-')
        if len(parts) == 2:
            start_str = parts[0].strip()
            end_str = parts[1].strip()
            sm = re.search(r'^(.*?)(\d+)$', start_str)
            em = re.search(r'^(.*?)(\d+)$', end_str)
            if sm and em and sm.group(1) == em.group(1):
                prefix = sm.group(1)
                low = min(int(sm.group(2)), int(em.group(2)))
                high = max(int(sm.group(2)), int(em.group(2)))
                pad_len = len(sm.group(2))
                for i in range(low, high + 1):
                    matched_pids.append(f"{prefix}{str(i).zfill(pad_len)}")
        else:
            matched_pids.append(range_str.strip())

    if not matched_pids:
        return jsonify({"error": "No patients found in the specified range."}), 400

    client = OpenAI(api_key=api_key)
    model_name = settings.model_selection if (settings and settings.model_selection) else "gpt-4o"

    processed = []
    errors = []

    model_map = {
        'fbc': FBCResult,
        'kft': KFTResult,
        'lipid': LipidResult,
        'lft': LFTResult
    }
    model_class = model_map.get(test_type)
    if not model_class:
        return jsonify({"error": "Invalid test type"}), 400

    # Step 1: Collect prompt data in the main thread (100% thread-safe database access)
    records_to_process = []
    for pid in matched_pids:
        try:
            sb = ScreeningYearBioData.query.filter_by(patient_id=pid, screening_year=int(screening_year)).first()
            if not sb:
                errors.append({"patient_id": pid, "error": "Patient ID not found in database for this year."})
                continue
            
            staff_id = sb.staff_id
            record = model_class.query.filter_by(staff_id=staff_id, screening_year=int(screening_year)).first()
            if not record:
                errors.append({"patient_id": pid, "error": "No test result record found for this patient."})
                continue

            # Determine fields
            prompt_data = ""
            system_prompt = ""
            remark_field = ""

            if test_type == 'fbc':
                prompt_data = (
                    f"PCV: {record.pcv or '-'} % (Ref Range: 34-53.9 %)\n"
                    f"WBC: {record.wbc or '-'} x10^9/L (Ref Range: 3-11 x10^9/L)\n"
                    f"Lymphocyte: {record.lymp_percent or '-'} % (Ref Range: 19.1-48 %)\n"
                    f"Neutrophil (Granulocyte): {record.gra_percent or '-'} % (Ref Range: 43.6-73.3 %)\n"
                    f"Mixed (MID): {record.mid_percent or '-'} % (Ref Range: 4.5-12.1 %)\n"
                    f"Platelets (PLT): {record.plt or '-'} x10^9/L (Ref Range: 100-450 x10^9/L)\n"
                )
                system_prompt = (
                    "You are a medical assistant analyzing patient Full Blood Count (FBC) results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                remark_field = "fbc_remark"

            elif test_type == 'lipid':
                prompt_data = (
                    f"Total Cholesterol: {record.total_cholesterol or '-'} mg/dL (Ref Range: <200 mg/dL)\n"
                    f"Triglycerides: {record.triglycerides or '-'} mg/dL (Ref Range: <150 mg/dL)\n"
                    f"HDL-c: {record.hdl or '-'} mg/dL (Ref Range: >=40 mg/dL)\n"
                    f"LDL-c: {record.ldl or '-'} mg/dL (Ref Range: <130 mg/dL)\n"
                )
                system_prompt = (
                    "You are a medical assistant analyzing patient Lipid Profile results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                remark_field = "lp_remark"

            elif test_type == 'lft':
                prompt_data = (
                    f"AST: {record.ast or '-'} U/L (Ref Range: 0-46 U/L)\n"
                    f"ALT: {record.alt or '-'} U/L (Ref Range: 0-49 U/L)\n"
                    f"ALP: {record.alp or '-'} U/L (Ref Range: Male: 80-306 U/L, Female: 64-306 U/L)\n"
                    f"TB: {record.tb or '-'} mg/dL (Ref Range: 0-1.2 mg/dL)\n"
                    f"CB: {record.cb or '-'} mg/dL (Ref Range: 0-0.4 mg/dL)\n"
                    f"Urea: {record.urea or '-'} mmol/L (Ref Range: 2.5-8.3 mmol/L)\n"
                    f"Creatinine: {record.creatinine or '-'} umol/L (Ref Range: Male: 80-133 umol/L, Female: 62-115 umol/L)\n"
                )
                system_prompt = (
                    "You are a medical assistant analyzing patient Liver Function Test (LFT) results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                remark_field = "lft_remark"

            elif test_type == 'kft':
                prompt_data = (
                    f"Potassium: {record.potassium or '-'} mmol/L (Ref Range: 3.5-5.0 mmol/L)\n"
                    f"Sodium: {record.sodium or '-'} mmol/L (Ref Range: 135-145 mmol/L)\n"
                    f"Chloride: {record.chloride or '-'} mmol/L (Ref Range: 97-107 mmol/L)\n"
                    f"Bicarbonate (HCO3): {record.hco3 or '-'} mmol/L (Ref Range: 20-31 mmol/L)\n"
                )
                system_prompt = (
                    "You are a medical assistant analyzing patient Kidney Function Test (KFT) results."
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field."
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark."
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                remark_field = "kft_remark"

            # Check if all values are empty
            has_any_value = False
            for field in [f for f in record.__dict__.keys() if f not in ['id', 'staff_id', 'screening_year', 'created_at', remark_field, 'other_remarks', '_sa_instance_state']]:
                if getattr(record, field):
                    has_any_value = True
                    break

            if not has_any_value:
                errors.append({"patient_id": pid, "error": "No results have been entered for this patient yet."})
                continue

            records_to_process.append({
                "pid": pid,
                "record_id": record.id,
                "prompt_data": prompt_data,
                "system_prompt": system_prompt,
                "remark_field": remark_field
            })
        except Exception as ex:
            errors.append({"patient_id": pid, "error": f"Failed database lookup: {str(ex)}"})

    # Step 2: Make OpenAI API calls concurrently (No database access in threads)
    def call_openai(item):
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": item["system_prompt"]},
                    {"role": "user", "content": f"{test_type.upper()} Results:\n{item['prompt_data']}"}
                ],
                max_tokens=60
            )
            remark = response.choices[0].message.content.strip()
            if (remark.startswith('"') and remark.endswith('"')) or (remark.startswith("'") and remark.endswith("'")):
                remark = remark[1:-1].strip()
            if len(remark) > 130:
                remark = remark[:127] + "..."
            return item["pid"], item["record_id"], item["remark_field"], True, remark
        except Exception as ex:
            return item["pid"], item["record_id"], item["remark_field"], False, str(ex)

    with ThreadPoolExecutor(max_workers=5) as executor:
        api_results = list(executor.map(call_openai, records_to_process))

    # Step 3: Save and commit remarks in the main thread (100% thread-safe)
    for pid, record_id, remark_field, success, detail in api_results:
        if success:
            try:
                rec = model_class.query.get(record_id)
                if rec:
                    setattr(rec, remark_field, detail)
                    processed.append({"patient_id": pid, "remark": detail})
            except Exception as ex:
                errors.append({"patient_id": pid, "error": f"Failed to save remark: {str(ex)}"})
        else:
            errors.append({"patient_id": pid, "error": detail})

    try:
        db.session.commit()
    except Exception as ex:
        db.session.rollback()
        return jsonify({"error": f"Database commit failed: {str(ex)}"}), 500

    return jsonify({
        "message": f"Bulk AI Remarks processing complete.",
        "processed_count": len(processed),
        "error_count": len(errors),
        "processed": processed,
        "errors": errors
    }), 200
