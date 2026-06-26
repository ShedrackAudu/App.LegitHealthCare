from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, BioData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, User, ScreeningYearBioData, ConsultationData, AuditLog, SystemConfig, ReportParameter
from datetime import datetime
from decorators import require_permission
from sqlalchemy import func
import pandas as pd
from io import BytesIO
import json

def get_param_prompt(params, param_id, default_name, default_val, default_unit, current_val):
    p = params.get(param_id)
    name = p.parameter_name if p else default_name
    val_range = p.reference_value if p else default_val
    unit = p.unit if p else default_unit
    unit_str = f" {unit}" if unit else ""
    # Strip newlines for prompt clarity
    val_range_clean = str(val_range).replace('\n', ' ').strip()
    unit_str_clean = str(unit_str).replace('\n', ' ').strip()
    return f"{name}: {current_val or '-'} {unit_str_clean} (Ref Range: {val_range_clean} {unit_str_clean})\n"

def generate_fbc_remark_in_background(app, staff_id, screening_year, fbc_data, company_context):
    with app.app_context():
        with app.test_request_context(environ_base={'HTTP_X_COMPANY_CONTEXT': company_context}):
            try:
                from models import db, AISettings, FBCResult, ReportParameter, BioData
                from openai import OpenAI
                import os
                
                settings = AISettings.query.first()
                api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
                if not api_key:
                    print("FBC AI Remark Error: OpenAI API Key is not configured.")
                    return
                    
                client = OpenAI(api_key=api_key)
                
                # Fetch patient gender
                patient_bio = BioData.query.filter(
                    func.lower(func.trim(BioData.staff_id)) == func.lower(func.trim(staff_id))
                ).first()
                gender_str = patient_bio.gender if (patient_bio and patient_bio.gender) else "Unknown"
                
                params = {p.id: p for p in ReportParameter.query.all()}
                prompt_data = (
                    f"Patient Gender: {gender_str}\n" +
                    get_param_prompt(params, 'pcv', 'PCV', '36-53.9', '%', fbc_data.get('pcv')) +
                    get_param_prompt(params, 'wbc', 'WBC', '3-11', 'x10^9/L', fbc_data.get('wbc')) +
                    get_param_prompt(params, 'lymphocyte', 'Lymphocyte', '0.6-4.1', 'x10⁹/L', fbc_data.get('lymp_abs')) +
                    get_param_prompt(params, 'neutrophil', 'Neutrophil (Granulocyte)', '1.5-8.0', 'x10⁹/L', fbc_data.get('gra_abs')) +
                    get_param_prompt(params, 'mixed', 'Mixed (MID)', '0.1-1.8', 'x10⁹/L', fbc_data.get('mid_abs')) +
                    get_param_prompt(params, 'platelets', 'Platelets (PLT)', '100-450', 'x10^9/L', fbc_data.get('plt'))
                )
                
                system_prompt = settings.prompt_fbc if (settings and settings.prompt_fbc) else (
                    "You are a medical assistant analyzing patient Full Blood Count (FBC) results. "
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                    "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                
                model_name = settings.model_selection if (settings and settings.model_selection) else "gpt-4o"
                api_params = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"FBC Results:\n{prompt_data}"}
                    ]
                }
                if model_name.startswith("o1") or model_name.startswith("o3"):
                    api_params["max_completion_tokens"] = 60
                else:
                    api_params["max_tokens"] = 60

                response = client.chat.completions.create(**api_params)
                
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
                from models import db, AISettings, LipidResult, ReportParameter, ConsultationData, BioData
                from openai import OpenAI
                import os
                
                settings = AISettings.query.first()
                api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
                if not api_key:
                    print("Lipid AI Remark Error: OpenAI API Key is not configured.")
                    return
                    
                client = OpenAI(api_key=api_key)
                
                # Fetch patient gender
                patient_bio = BioData.query.filter(
                    func.lower(func.trim(BioData.staff_id)) == func.lower(func.trim(staff_id))
                ).first()
                gender_str = patient_bio.gender if (patient_bio and patient_bio.gender) else "Unknown"
                
                report_params = {p.id: p for p in ReportParameter.query.all()}

                # Determine blood sugar type (FBS=Fasting vs RBS=Non-Fasting) from consultation data
                consultation = ConsultationData.query.filter(
                    func.lower(func.trim(ConsultationData.staff_id)) == func.lower(func.trim(staff_id)),
                    ConsultationData.screening_year == screening_year
                ).first()
                blood_sugar_type = "Unknown"
                blood_sugar_details = ""
                if consultation:
                    fbs_val = consultation.fbs
                    rbs_val = consultation.rbs
                    if fbs_val and fbs_val.strip().lower() not in ('', 'not applicable', 'n/a'):
                        blood_sugar_type = "Fasting (FBS)"
                        blood_sugar_details = get_param_prompt(report_params, 'fbs', 'FBS', '70-99', 'mg/dL', fbs_val)
                    elif rbs_val and rbs_val.strip().lower() not in ('', 'not applicable', 'n/a'):
                        blood_sugar_type = "Non-Fasting (RBS)"
                        blood_sugar_details = get_param_prompt(report_params, 'rbs', 'RBS', '70-140', 'mg/dL', rbs_val)
                
                prompt_data = (
                    f"Patient Gender: {gender_str}\n" +
                    f"Blood Sugar Type: {blood_sugar_type} (indicates whether the patient was fasting or non-fasting when the sample was collected)\n" +
                    (blood_sugar_details if blood_sugar_details else "Blood Sugar: Not Entered\n") +
                    get_param_prompt(report_params, 'total_cholesterol', 'Total Cholesterol', '<200', 'mg/dL', lipid_data.get('total_cholesterol')) +
                    get_param_prompt(report_params, 'triglycerides', 'Triglycerides', '<150', 'mg/dL', lipid_data.get('triglycerides')) +
                    get_param_prompt(report_params, 'hdl', 'HDL-c', '>=40', 'mg/dL', lipid_data.get('hdl')) +
                    get_param_prompt(report_params, 'ldl', 'LDL-c', '<130', 'mg/dL', lipid_data.get('ldl'))
                )
                
                system_prompt = settings.prompt_lipid if (settings and settings.prompt_lipid) else (
                    "You are a medical assistant analyzing patient Lipid Profile results. "
                    "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                    "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
                    "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
                    "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                )
                
                model_name = settings.model_selection if (settings and settings.model_selection) else "gpt-4o"
                api_params = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Lipid Results:\n{prompt_data}"}
                    ]
                }
                if model_name.startswith("o1") or model_name.startswith("o3"):
                    api_params["max_completion_tokens"] = 60
                else:
                    api_params["max_tokens"] = 60
 
                response = client.chat.completions.create(**api_params)
                
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
        if not record.tb:
            record.tb = f"{random.uniform(0.1, 1.2):.2f}"
        if not record.cb:
            tb_val = float(record.tb)
            # Ensure CB is not higher than TB, capped at 0.4 clinical max bound
            max_cb_bound = min(0.4, tb_val)
            # Ensure lower bound is valid in case TB is extremely low (e.g. 0.1)
            min_cb_bound = min(0.1, max_cb_bound)
            record.cb = f"{random.uniform(min_cb_bound, max_cb_bound):.2f}"
        if not record.ast:
            record.ast = f"{random.uniform(10.1, 46.0):.1f}"
        if not record.alp:
            record.alp = str(random.randint(80, 200))
        if not record.urea:
            record.urea = f"{random.uniform(3.5, 8.33):.2f}"

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

        if test_type == 'special' and user_id:
            current_test_type = data.get('current_test_type')
            dept_name = None
            if current_test_type == 'ecg':
                dept_name = 'ECG'
            elif current_test_type == 'spirometry':
                dept_name = 'Spirometry'
            elif current_test_type == 'audiometry':
                dept_name = 'Audiometry'
                
            if dept_name:
                try:
                    from models import StaffPatientSeen
                    existing_seen = StaffPatientSeen.query.filter_by(
                        user_id=int(user_id),
                        staff_id=staff_id,
                        screening_year=int(screening_year),
                        department=dept_name
                    ).first()
                    if not existing_seen:
                        new_seen = StaffPatientSeen(
                            user_id=int(user_id),
                            staff_id=staff_id,
                            screening_year=int(screening_year),
                            department=dept_name
                        )
                        db.session.add(new_seen)
                except Exception as seen_err:
                    import sys
                    sys.stderr.write(f"[DEBUG] Error recording seen special test: {seen_err}\n")

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
    
    # Log view action in audit trail
    try:
        from models import AuditLog
        AuditLog.log_action(
            action=f"View Patient {test_type.upper()} Result",
            resource=f"Patient:{staff_id}",
            details={"screening_year": screening_year, "test_type": test_type}
        )
    except Exception as audit_err:
        pass
        
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
    """Start a background bulk AI remarks generation task. Returns a task_id immediately."""
    try:
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
        override = data.get('override', False)
        if not range_str or not screening_year:
            return jsonify({"error": "Range and Screening Year are required"}), 400

        from models import db, AISettings, FBCResult, KFTResult, LipidResult, LFTResult, ScreeningYearBioData, BioData
        from openai import OpenAI
        import os
        import re
        import uuid
        import gevent
        from bulk_tasks import create_task, update_task_success, update_task_error, complete_task, fail_task, cleanup_old_tasks

        # Clean up old tasks on each new request
        cleanup_old_tasks()

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

        model_name = settings.model_selection if (settings and settings.model_selection) else "gpt-4o"

        model_map = {
            'fbc': FBCResult,
            'kft': KFTResult,
            'lipid': LipidResult,
            'lft': LFTResult
        }
        model_class = model_map.get(test_type)
        if not model_class:
            return jsonify({"error": "Invalid test type"}), 400

        target_remark_fields = {
            'fbc': 'fbc_remark',
            'lipid': 'lp_remark',
            'lft': 'lft_remark',
            'kft': 'kft_remark'
        }
        target_remark_field = target_remark_fields.get(test_type)

        # Step 1: Collect prompt data in the main thread (100% thread-safe database access)
        report_params = {p.id: p for p in ReportParameter.query.all()}
        records_to_process = []
        initial_errors = []
        for pid in matched_pids:
            try:
                sb = ScreeningYearBioData.query.filter_by(patient_id=pid, screening_year=int(screening_year)).first()
                if not sb:
                    initial_errors.append({"patient_id": pid, "error": "Patient ID not found in database for this year."})
                    continue
                
                staff_id = sb.staff_id
                
                # Fetch patient gender
                patient_bio = BioData.query.filter(
                    func.lower(func.trim(BioData.staff_id)) == func.lower(func.trim(staff_id))
                ).first()
                gender_str = patient_bio.gender if (patient_bio and patient_bio.gender) else "Unknown"

                record = model_class.query.filter_by(staff_id=staff_id, screening_year=int(screening_year)).first()
                if not record:
                    initial_errors.append({"patient_id": pid, "error": "No test result record found for this patient."})
                    continue

                # Skip if patient already has a remark for this test type and override is not enabled
                if target_remark_field and not override:
                    existing_remark = getattr(record, target_remark_field, None)
                    if existing_remark and existing_remark.strip():
                        initial_errors.append({"patient_id": pid, "error": "Skipped: remark already exists."})
                        continue

                # Determine fields
                prompt_data = ""
                system_prompt = ""
                remark_field = ""

                if test_type == 'fbc':
                    prompt_data = (
                        get_param_prompt(report_params, 'pcv', 'PCV', '36-53.9', '%', record.pcv) +
                        get_param_prompt(report_params, 'wbc', 'WBC', '3-11', 'x10^9/L', record.wbc) +
                        get_param_prompt(report_params, 'lymphocyte', 'Lymphocyte', '0.6-4.1', 'x10⁹/L', record.lymp_abs) +
                        get_param_prompt(report_params, 'neutrophil', 'Neutrophil (Granulocyte)', '1.5-8.0', 'x10⁹/L', record.gra_abs) +
                        get_param_prompt(report_params, 'mixed', 'Mixed (MID)', '0.1-1.8', 'x10⁹/L', record.mid_abs) +
                        get_param_prompt(report_params, 'platelets', 'Platelets (PLT)', '100-450', 'x10^9/L', record.plt)
                    )
                    system_prompt = settings.prompt_fbc if (settings and settings.prompt_fbc) else (
                        "You are a medical assistant analyzing patient Full Blood Count (FBC) results. "
                        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
                        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
                        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                    )
                    remark_field = "fbc_remark"

                elif test_type == 'lipid':
                    # Determine blood sugar type (FBS=Fasting vs RBS=Non-Fasting) from consultation data
                    lipid_consultation = ConsultationData.query.filter(
                        func.lower(func.trim(ConsultationData.staff_id)) == func.lower(func.trim(record.staff_id)),
                        ConsultationData.screening_year == record.screening_year
                    ).first()
                    lipid_blood_sugar_type = "Unknown"
                    lipid_blood_sugar_details = ""
                    if lipid_consultation:
                        lipid_fbs_val = lipid_consultation.fbs
                        lipid_rbs_val = lipid_consultation.rbs
                        if lipid_fbs_val and lipid_fbs_val.strip().lower() not in ('', 'not applicable', 'n/a'):
                            lipid_blood_sugar_type = "Fasting (FBS)"
                            lipid_blood_sugar_details = get_param_prompt(report_params, 'fbs', 'FBS', '70-99', 'mg/dL', lipid_fbs_val)
                        elif lipid_rbs_val and lipid_rbs_val.strip().lower() not in ('', 'not applicable', 'n/a'):
                            lipid_blood_sugar_type = "Non-Fasting (RBS)"
                            lipid_blood_sugar_details = get_param_prompt(report_params, 'rbs', 'RBS', '70-140', 'mg/dL', lipid_rbs_val)
                    
                    prompt_data = (
                        f"Blood Sugar Type: {lipid_blood_sugar_type} (indicates whether the patient was fasting or non-fasting when the sample was collected)\n" +
                        (lipid_blood_sugar_details if lipid_blood_sugar_details else "Blood Sugar: Not Entered\n") +
                        get_param_prompt(report_params, 'total_cholesterol', 'Total Cholesterol', '<200', 'mg/dL', record.total_cholesterol) +
                        get_param_prompt(report_params, 'triglycerides', 'Triglycerides', '<150', 'mg/dL', record.triglycerides) +
                        get_param_prompt(report_params, 'hdl', 'HDL-c', '>=40', 'mg/dL', record.hdl) +
                        get_param_prompt(report_params, 'ldl', 'LDL-c', '<130', 'mg/dL', record.ldl)
                    )
                    system_prompt = settings.prompt_lipid if (settings and settings.prompt_lipid) else (
                        "You are a medical assistant analyzing patient Lipid Profile results. "
                        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
                        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
                        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                    )
                    remark_field = "lp_remark"

                elif test_type == 'lft':
                    prompt_data = (
                        get_param_prompt(report_params, 'ast', 'AST', '0-46', 'U/L', record.ast) +
                        get_param_prompt(report_params, 'alt', 'ALT', '0-49', 'U/L', record.alt) +
                        get_param_prompt(report_params, 'alp', 'ALP', 'Male: 80-306, Female: 64-306', 'U/L', record.alp) +
                        get_param_prompt(report_params, 'tb', 'TB', '0-1.2', 'mg/dL', record.tb) +
                        get_param_prompt(report_params, 'cb', 'CB', '0-0.4', 'mg/dL', record.cb)
                    )
                    system_prompt = settings.prompt_lft if (settings and settings.prompt_lft) else (
                        "You are a medical assistant analyzing patient Liver Function Test (LFT) results. "
                        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. For example, if Conjugated Bilirubin (CB) is 0.35 mg/dL and the reference range is 0-0.4 mg/dL, it is NORMAL. Treat all values within the ranges as normal. "
                        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
                        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
                    )
                    remark_field = "lft_remark"

                elif test_type == 'kft':
                    lft_record = LFTResult.query.filter_by(staff_id=record.staff_id, screening_year=record.screening_year).first()
                    urea_val = lft_record.urea if lft_record else '-'
                    creatinine_val = lft_record.creatinine if lft_record else '-'
                    prompt_data = (
                        get_param_prompt(report_params, 'potassium', 'Potassium', '3.5-5.0', 'mmol/L', record.potassium) +
                        get_param_prompt(report_params, 'sodium', 'Sodium', '135-145', 'mmol/L', record.sodium) +
                        get_param_prompt(report_params, 'chloride', 'Chloride', '97-107', 'mmol/L', record.chloride) +
                        get_param_prompt(report_params, 'bicarbonate', 'Bicarbonate (HCO3)', '20-31', 'mmol/L', record.hco3) +
                        get_param_prompt(report_params, 'urea', 'Urea', '2.5-8.33', 'mmol/L', urea_val) +
                        get_param_prompt(report_params, 'creatinine', 'Creatinine', 'Male: 80-133, Female: 62-115', 'umol/L', creatinine_val)
                    )
                    system_prompt = settings.prompt_kft if (settings and settings.prompt_kft) else (
                        "You are a medical assistant analyzing patient Kidney Function Test (KFT) results. "
                        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
                        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
                        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
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
                    initial_errors.append({"patient_id": pid, "error": "No results have been entered for this patient yet."})
                    continue

                if prompt_data:
                    prompt_data = f"Patient Gender: {gender_str}\n" + prompt_data

                records_to_process.append({
                    "pid": pid,
                    "record_id": record.id,
                    "prompt_data": prompt_data,
                    "system_prompt": system_prompt,
                    "remark_field": remark_field
                })
            except Exception as ex:
                initial_errors.append({"patient_id": pid, "error": f"Failed database lookup: {str(ex)}"})

        # If there are no records to process, return results immediately (no background task needed)
        if not records_to_process:
            return jsonify({
                "message": "Bulk AI Remarks processing complete.",
                "task_id": None,
                "total": 0,
                "processed_count": 0,
                "error_count": len(initial_errors),
                "processed": [],
                "errors": initial_errors,
                "status": "completed"
            }), 200

        # Step 2: Create a background task and return task_id immediately
        task_id = str(uuid.uuid4())
        total_to_process = len(records_to_process)
        create_task(task_id, total_to_process)


        # Get the Flask app for app_context in the background greenlet
        from flask import current_app
        app = current_app._get_current_object()
        company_context = request.headers.get('X-Company-Context', '')

        # Capture model class name for re-import in background context
        model_class_name = model_class.__name__

        def _run_bulk_ai_task():
            """Background greenlet that processes OpenAI calls and saves results."""
            with app.app_context():
                with app.test_request_context(environ_base={'HTTP_X_COMPANY_CONTEXT': company_context}):
                    try:
                        from models import db, FBCResult, KFTResult, LipidResult, LFTResult
                        from openai import OpenAI as BGOpenAI
                        from gevent.pool import Pool as GeventPool

                        bg_model_map = {
                            'FBCResult': FBCResult,
                            'KFTResult': KFTResult,
                            'LipidResult': LipidResult,
                            'LFTResult': LFTResult
                        }
                        bg_model_class = bg_model_map[model_class_name]
                        bg_client = BGOpenAI(api_key=api_key)

                        def call_openai_and_save(item):
                            """Process a single patient: call OpenAI, save to DB, update task."""
                            with app.app_context():
                                with app.test_request_context(environ_base={'HTTP_X_COMPANY_CONTEXT': company_context}):
                                    try:
                                        ai_params = {
                                            "model": model_name,
                                            "messages": [
                                                {"role": "system", "content": item["system_prompt"]},
                                                {"role": "user", "content": f"{test_type.upper()} Results:\n{item['prompt_data']}"}
                                            ]
                                        }
                                        if model_name.startswith("o1") or model_name.startswith("o3"):
                                            ai_params["max_completion_tokens"] = 60
                                        else:
                                            ai_params["max_tokens"] = 60

                                        response = bg_client.chat.completions.create(**ai_params)
                                        remark = response.choices[0].message.content.strip()
                                        if (remark.startswith('"') and remark.endswith('"')) or (remark.startswith("'") and remark.endswith("'")):
                                            remark = remark[1:-1].strip()
                                        if len(remark) > 130:
                                            remark = remark[:127] + "..."

                                        # Save to DB
                                        rec = bg_model_class.query.get(item["record_id"])
                                        if rec:
                                            setattr(rec, item["remark_field"], remark)
                                            db.session.commit()

                                        update_task_success(task_id, item["pid"], remark)
                                    except Exception as ex:
                                        try:
                                            db.session.rollback()
                                        except Exception:
                                            pass
                                        update_task_error(task_id, item["pid"], str(ex))

                        # Process with concurrency pool of 5
                        pool = GeventPool(5)
                        pool.map(call_openai_and_save, records_to_process)

                        complete_task(task_id)
                    except Exception as e:
                        import traceback
                        traceback.print_exc()
                        try:
                            db.session.rollback()
                        except Exception:
                            pass
                        fail_task(task_id, str(e))

        # Spawn the background greenlet
        gevent.spawn(_run_bulk_ai_task)

        return jsonify({
            "task_id": task_id,
            "total": total_to_process,
            "skipped_count": len(initial_errors),
            "skipped": initial_errors,
            "message": "Bulk AI remarks generation started in background."
        }), 202

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": f"Server processing error: {str(e)}"}), 500


@tests_bp.route('/bulk-ai-remarks/status/<task_id>', methods=['GET'])
@jwt_required()
def bulk_ai_remarks_status(task_id):
    """Poll the progress of a background bulk AI remarks task."""
    from bulk_tasks import get_task

    task = get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found or expired."}), 404

    return jsonify({
        "task_id": task_id,
        "status": task["status"],
        "total": task["total"],
        "processed_count": task["processed_count"],
        "error_count": task["error_count"],
        "processed": task["processed"],
        "errors": task["errors"],
        "error_message": task.get("error_message"),
    }), 200
