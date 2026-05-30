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
                    f"WBC: {fbc_data.get('wbc') or '-'} x10^9/L (Ref Range: 5.00 - 11.60 x10^9/L)\n"
                    f"LYM (Lymphocyte Absolute): {fbc_data.get('lymp_abs') or '-'} x10^9/L (Ref Range: 1.30 - 4.00 x10^9/L)\n"
                    f"MID (Mixed Absolute): {fbc_data.get('mid_abs') or '-'} x10^9/L (Ref Range: 0.30 - 1.00 x10^9/L)\n"
                    f"GRA (Granulocyte Absolute): {fbc_data.get('gra_abs') or '-'} x10^9/L (Ref Range: 2.40 - 7.60 x10^9/L)\n"
                    f"LYM% (Lymphocyte Percentage): {fbc_data.get('lymp_percent') or '-'} % (Ref Range: 19.1 - 48.5 %)\n"
                    f"MID% (Mixed Percentage): {fbc_data.get('mid_percent') or '-'} % (Ref Range: 4.5 - 12.1 %)\n"
                    f"GRA% (Granulocyte Percentage): {fbc_data.get('gra_percent') or '-'} % (Ref Range: 43.6 - 73.4 %)\n"
                    f"RBC: {fbc_data.get('rbc') or '-'} x10^12/L (Ref Range: 4.33 - 5.78 x10^12/L)\n"
                    f"HGB (Hemoglobin): {fbc_data.get('hgb') or '-'} g/dL (Ref Range: 13.2 - 17.3 g/dL)\n"
                    f"HCT/PCV (Hematocrit): {fbc_data.get('pcv') or '-'} % (Ref Range: 39.90 - 53.90 %)\n"
                    f"MCV: {fbc_data.get('mcv') or '-'} fL (Ref Range: 84 - 98 fL)\n"
                    f"MCH: {fbc_data.get('mch') or '-'} pg (Ref Range: 27.5 - 32.4 pg)\n"
                    f"MCHC: {fbc_data.get('mchc') or '-'} g/dL (Ref Range: 31.7 - 34.2 g/dL)\n"
                    f"RDWc: {fbc_data.get('rdw') or '-'} % (Ref Range: 11.1 - 14.0 %)\n"
                    f"PLT (Platelets): {fbc_data.get('plt') or '-'} x10^9/L (Ref Range: 156 - 342 x10^9/L)\n"
                    f"PDWc: {fbc_data.get('pdw') or '-'} % (Ref Range: 37.8 - 43.6 %)\n"
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
