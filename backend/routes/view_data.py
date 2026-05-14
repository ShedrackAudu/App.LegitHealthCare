from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from models import (
    db, BioData, ScreeningYearBioData, ConsultationData,
    FBCResult, KFTResult, LipidResult, LFTResult, 
    SpecialTestsResult, DirectorReview, AuditLog, QueueEntry,
    ReportVerification, AppBranding
)
import uuid

from sqlalchemy import func
from datetime import datetime
from decorators import require_permission
from utils.ip import get_client_ip
from utils.progress_utils import calculate_report_progress

view_data_bp = Blueprint('view_data', __name__)

@view_data_bp.route('/users/<string:user_id>/profile', methods=['GET'])
@require_permission('view_users')
def get_user_profile(user_id):
    from models import StaffUser, PatientPortalUser, BioData
    
    if user_id.startswith('p'):
        real_id = int(user_id[1:])
        user = PatientPortalUser.query.get_or_404(real_id)
        u_dict = user.to_dict()
        u_dict['section'] = None
        u_dict['department'] = None
        
        # Explicitly check each clinical database using its engine
        for bind_key in ['dcp', 'dct']:
            try:
                # Use current_app to safely get the engine
                from flask import current_app
                engine = db.get_engine(current_app, bind=bind_key)
                
                from sqlalchemy import text
                # We need all bio metrics for the profile enrichment
                sql = text("""
                    SELECT department, middle_name, gender, age, nationality, race, dob, phone 
                    FROM bio_data 
                    WHERE LOWER(staff_id) = LOWER(:sid)
                """)
                with engine.connect() as conn:
                    row = conn.execute(sql, {"sid": user.username}).fetchone()
                    if row:
                        # Safely handle DOB which might be string or date object
                        dob_val = row[6]
                        if dob_val and hasattr(dob_val, 'isoformat'):
                            dob_val = dob_val.isoformat()
                        elif dob_val:
                            dob_val = str(dob_val)

                        u_dict.update({
                            'section': bind_key.upper(),
                            'department': row[0],
                            'middle_name': row[1],
                            'gender': row[2],
                            'age': row[3],
                            'nationality': row[4],
                            'race': row[5],
                            'dob': dob_val,
                        })
                        # Fallback for phone
                        if not u_dict.get('phone') or u_dict.get('phone') == 'N/A':
                            u_dict['phone'] = row[7]
                        break
            except Exception as e:
                import logging
                logging.error(f"Failed to fetch profile details from {bind_key}: {str(e)}")
                continue
        return jsonify(u_dict), 200
    else:
        try:
            u_id = int(user_id)
            user = StaffUser.query.get_or_404(u_id)
            return jsonify(user.to_dict()), 200
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
@view_data_bp.route('/patients/search', methods=['GET'])
@require_permission([
    'view_patients', 'registration', 'consultation', 'lab_tests', 
    'lab_fbc', 'lab_kft', 'lab_lipid', 'lab_lft', 'lab_ecg', 
    'lab_spirometry', 'lab_audiometry', 'director_review', 
    'manage_appointments', 'edit_patient', 
    'delete_patient', 'manage_access_keys'
])
def search_patients():
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    year = request.args.get('year')
    
    if not query or len(query) < 1: 
        return jsonify({"results": [], "total": 0, "pages": 0}), 200
    
    search = f"%{query}%"
    strict = request.args.get('strict', 'false').lower() == 'true'
    
    # 1. Base Query with Filtering
    if strict and year:
        # Filter strictly for patients registered in the specific screening matrix
        base_query = BioData.query.join(
            ScreeningYearBioData, 
            BioData.staff_id == ScreeningYearBioData.staff_id
        ).filter(
            ScreeningYearBioData.screening_year == int(year)
        ).filter(
            (BioData.staff_id.ilike(search)) |
            (BioData.first_name.ilike(search)) |
            (BioData.middle_name.ilike(search)) |
            (BioData.last_name.ilike(search)) |
            (BioData.department.ilike(search)) |
            (BioData.phone.ilike(search)) |
            (BioData.email.ilike(search))
        ).order_by(BioData.created_at.desc())
    else:
        base_query = BioData.query.filter(
            (BioData.staff_id.ilike(search)) |
            (BioData.first_name.ilike(search)) |
            (BioData.middle_name.ilike(search)) |
            (BioData.last_name.ilike(search)) |
            (BioData.department.ilike(search)) |
            (BioData.phone.ilike(search)) |
            (BioData.email.ilike(search))
        ).order_by(BioData.created_at.desc())

    # 2. Paginate
    pagination = base_query.paginate(page=page, per_page=per_page, error_out=False)
    
    final_results = []
    for p in pagination.items:
        # Get yearly patient ID
        if year:
            yearly_record = ScreeningYearBioData.query.filter_by(
                staff_id=p.staff_id, 
                screening_year=int(year)
            ).first()
        else:
            yearly_record = ScreeningYearBioData.query.filter_by(
                staff_id=p.staff_id
            ).order_by(ScreeningYearBioData.screening_year.desc()).first()
            
        p_id = yearly_record.patient_id if yearly_record else None

        final_results.append({
            "staff_id": p.staff_id, "patient_id": p_id, "first_name": p.first_name, 
            "middle_name": p.middle_name, "last_name": p.last_name, "department": p.department, 
            "gender": p.gender, "dob": p.dob.isoformat() if p.dob else None, 
            "age": p.age, "phone": p.phone, "email": p.email,
            "race": p.race, "nationality": p.nationality,
            "section": (request.headers.get('X-Company-Context') or 'DCP').upper()
        })

    return jsonify({
        "results": final_results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }), 200

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@view_data_bp.route('/patients/all', methods=['GET'])
@require_permission('view_patients')
def get_all_patients():
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = BioData.query.order_by(BioData.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "results": [{
            "staff_id": p.staff_id,
            "first_name": p.first_name,
            "middle_name": p.middle_name,
            "last_name": p.last_name,
            "department": p.department,
            "gender": p.gender,
            "dob": p.dob.isoformat() if p.dob else None,
            "age": p.age,
            "phone": p.phone,
            "email": p.email,
            "race": p.race,
            "nationality": p.nationality,
            "section": bind.upper()
        } for p in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }), 200

@view_data_bp.route('/patients/<string:staff_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def handle_patient(staff_id):
    user_id = get_jwt_identity()
    from models import StaffUser
    user = StaffUser.query.get(user_id)
    if not user:
        return jsonify({"error": "Staff authentication required"}), 401

    if request.method == 'DELETE':
        if not user.has_permission('delete_patient') and user.username != 'admin':
            return jsonify({"error": "Permission 'delete_patient' required"}), 403
    elif request.method == 'PUT':
        if not user.has_permission('edit_patient') and user.username != 'admin':
            return jsonify({"error": "Permission 'edit_patient' required"}), 403

    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    clean_staff_id = staff_id.strip()
    patient = BioData.query.filter(func.lower(BioData.staff_id) == func.lower(clean_staff_id)).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
        
    if request.method == 'DELETE':
        # Fully cascade delete all data for this patient
        models_to_clean = [
            ConsultationData, FBCResult, KFTResult, 
            LipidResult, LFTResult, SpecialTestsResult,
            ScreeningYearBioData, DirectorReview, QueueEntry
        ]
        
        for model in models_to_clean:
            db.session.query(model).filter(func.lower(model.staff_id) == func.lower(clean_staff_id)).delete(synchronize_session=False)
            
        db.session.delete(patient)

        # Audit Log
        audit = AuditLog(
            user_id=get_jwt_identity(),
            action='Delete Patient (Full)',
            resource=f"Patient:{clean_staff_id}",
            details=f"Patient {patient.first_name} {patient.last_name} and all data deleted.",
            ip_address=get_client_ip()
        )
        db.session.add(audit)
        db.session.commit()
        return jsonify({"message": "Patient and all associated screening data deleted"}), 200
        
    if request.method == 'PUT':
        data = request.json
        # Update fields
        first_name = data.get('first_name', patient.first_name)
        last_name = data.get('last_name', patient.last_name)
        
        patient.first_name = first_name
        patient.middle_name = data.get('middle_name', patient.middle_name)
        patient.last_name = last_name
        patient.department = data.get('department', patient.department)
        
        # 1. Sync with ScreeningYearBioData in the current bind
        new_p_id = data.get('patient_id')
        current_year = data.get('screening_year', datetime.now().year)
        
        # Update yearly record fields (Names)
        yearly_q = ScreeningYearBioData.query.filter(
            func.lower(ScreeningYearBioData.staff_id) == func.lower(clean_staff_id),
            ScreeningYearBioData.screening_year == int(current_year)
        )
        
        yearly_record = yearly_q.first()
        if yearly_record:
            # Check for Patient ID uniqueness if it's changing
            if new_p_id and str(new_p_id) != str(yearly_record.patient_id):
                conflict = ScreeningYearBioData.query.filter_by(
                    screening_year=int(current_year),
                    patient_id=new_p_id
                ).first()
                if conflict:
                    return jsonify({"error": f"Patient ID {new_p_id} is already assigned to another patient for {current_year}"}), 400
                yearly_record.patient_id = new_p_id
            
            yearly_record.first_name = first_name
            yearly_record.last_name = last_name
        
        # 2. Sync with PatientPortalUser in the 'patients' bind (Aggressive Force)
        try:
            from sqlalchemy import text
            # Ensure we use the 'patients' engine directly for cross-DB reliability
            patients_engine = db.engines.get('patients')
            if patients_engine:
                with patients_engine.connect() as conn:
                    # Sync by both username (Staff ID) OR email for maximum reliability
                    sync_query = text("""
                        UPDATE patient_users 
                        SET first_name = :f, last_name = :l 
                        WHERE LOWER(username) = LOWER(:sid) 
                        OR (email IS NOT NULL AND LOWER(email) = LOWER(:email))
                    """)
                    conn.execute(sync_query, {
                        "f": first_name, 
                        "l": last_name, 
                        "sid": clean_staff_id,
                        "email": patient.email
                    })
                    conn.commit()
                    print(f"Force-sync successful for portal account: {clean_staff_id} / {patient.email}")
        except Exception as e:
            print(f"Aggressive sync to portal failed: {str(e)}")
        patient.gender = data.get('gender', patient.gender)
        
        dob_str = data.get('dob')
        if dob_str:
            try:
                patient.dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": f"Invalid date format: {dob_str}. Expected YYYY-MM-DD"}), 400
                
        patient.age = data.get('age', patient.age)
        patient.phone = data.get('phone', patient.phone)
        patient.email = data.get('email', patient.email)
        patient.race = data.get('race', patient.race)
        patient.nationality = data.get('nationality', patient.nationality)
        
        # Sync to ScreeningYearBioData for directory consistency
        try:
            yearly_records = ScreeningYearBioData.query.filter_by(staff_id=patient.staff_id).all()
            for yr in yearly_records:
                yr.first_name = patient.first_name
                yr.last_name = patient.last_name
                yr.department = patient.department
                yr.gender = patient.gender
                yr.age = patient.age
                
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Update failed: {str(e)}"}), 500

        # Audit Log
        try:
            audit = AuditLog(
                user_id=get_jwt_identity(),
                action='Update Patient Profile',
                resource=f"Patient:{patient.staff_id}",
                details=f"Updated profile for {patient.first_name} {patient.last_name}.",
                ip_address=get_client_ip()
            )
            db.session.add(audit)
            db.session.commit()
        except Exception:
            pass # Audit log failure shouldn't block the main update
            
        return jsonify({"message": "Patient profile updated successfully"}), 200

@view_data_bp.route('/records/screening/<int:year>', methods=['GET'])
@require_permission('view_records')
def get_screening_records(year):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    search_query = request.args.get('q', '').strip()
    
    query = ScreeningYearBioData.query.filter_by(screening_year=year)
    
    if search_query:
        query = query.filter(
            (ScreeningYearBioData.staff_id.ilike(f"%{search_query}%")) |
            (ScreeningYearBioData.first_name.ilike(f"%{search_query}%")) |
            (ScreeningYearBioData.last_name.ilike(f"%{search_query}%"))
        )
    
    # Sort by created_at desc to show newest first
    query = query.order_by(ScreeningYearBioData.created_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    results = []
    for yp in pagination.items:
        # Aggregated Patient Data
        record = {
            "id": yp.id,
            "patient_id": yp.patient_id,
            "staff_id": yp.staff_id,
            "first_name": yp.first_name,
            "last_name": yp.last_name,
            "department": yp.department,
            "gender": yp.gender,
            "age": yp.age,
            "created_at": yp.created_at.isoformat() if yp.created_at else None
        }
        
        # robust bio-data lookup inside current section only
        bio = BioData.query.filter_by(staff_id=yp.staff_id).first()
        
        if bio:
            record.update({
                "middle_name": bio.middle_name,
                "dob": bio.dob.isoformat() if bio.dob else None,
                "phone": bio.phone,
                "email": bio.email,
                "race": bio.race,
                "nationality": bio.nationality
            })
        else:
            # Even if bio_data is missing in dcp/dct, yp (ScreeningYearBioData) has partial fields.
            # We already populated those above. middle_name/phone/email/race/nationality remain None.
            pass
            
        # Clinical Joins - Full Fields
        c = ConsultationData.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        f = FBCResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        k = KFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        li = LipidResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        lf = LFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        s = SpecialTestsResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        dr = DirectorReview.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
        
        # Hydrate all fields
        if c: record["consultation"] = {
            "luts": c.luts, "chronic_cough": c.chronic_cough, "chronic_chest_pain": c.chronic_chest_pain,
            "chest_infection": c.chest_infection, "heart_dx": c.heart_dx, "palor": c.palor, 
            "jaundice": c.jaundice, "murmur": c.murmur, "chest_status": c.chest_status,
            "psa": c.psa, "psa_remark": c.psa_remark, "fbs": c.fbs, "rbs": c.rbs, 
            "sugar_remark": c.sugar_remark, "ua_result": c.ua_result, "ua_remark": c.ua_remark,
            "dm": c.dm_status, "htn": c.htn_status, "bp": c.bp, "pulse": c.pulse, "spo2": c.spo2,
            "hs": c.hs_status, "breast": c.breast_exam, "breast_remark": c.breast_remark,
            "abdomen": c.abdomen, "hx_pe": c.assessment_hx_pe, "other_assessments": c.other_assessments,
            "lab_remark": c.overall_lab_remark, "remarks": c.other_remarks, "assessment": c.overall_assessment
        }
        if f: record["fbc"] = {
            "pcv": f.pcv, "wbc": f.wbc, "plt": f.plt, "rbc": f.rbc, "hgb": f.hgb,
            "lymp_percent": f.lymp_percent, "lymp_abs": f.lymp_abs, "gra_percent": f.gra_percent,
            "gra_abs": f.gra_abs, "mid_percent": f.mid_percent, "mid_abs": f.mid_abs,
            "mcv": f.mcv, "mch": f.mch, "mchc": f.mchc, "rdw": f.rdw, "pdw": f.pdw,
            "remark": f.fbc_remark, "other_remarks": f.other_remarks
        }
        if k: record["kft"] = {
            "potassium": k.potassium, "sodium": k.sodium, "chloride": k.chloride, 
            "urea": k.urea, "creatinine": k.creatinine, "bicarbonate": k.bicarbonate_ca, 
            "hco3": k.hco3, "remark": k.kft_remark, "other_remarks": k.other_remarks
        }
        if li: record["lipid"] = {
            "tcho": li.total_cholesterol, "tg": li.triglycerides, "hdl": li.hdl, "ldl": li.ldl,
            "remark": li.lp_remark, "other_remarks": li.other_remarks
        }
        if lf: record["lft"] = {
            "ast": lf.ast, "alt": lf.alt, "alp": lf.alp, "tb": lf.tb, "cb": lf.cb,
            "remark": lf.lft_remark, "other_remarks": lf.other_remarks
        }
        if s: record["special"] = {
            "ecg": s.ecg_result, "ecg_remark": s.ecg_remark, 
            "spirometry": s.spirometry_result, "spirometry_remark": s.spirometry_remark,
            "audiometry": s.audiometry_result, "audiometry_remark": s.audiometry_remark,
            "weight": s.weight, "height": s.height
        }
        
        if dr: record["director_review"] = {
            "comment_one": dr.comment_one,
            "comment_two": dr.comment_two,
            "comment_three": dr.comment_three,
            "comment_four": dr.comment_four,
            "lab_remark": dr.overall_lab_remark,
            "assessment": dr.overall_assessment,
            "hx_pe": dr.assessment_hx_pe,
            "other_assessments": dr.other_assessments,
            "other_remarks": dr.other_remarks
        }
            
        results.append(record)
        
    return jsonify({
        "records": results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200

@view_data_bp.route('/records/screening/<int:id>', methods=['DELETE'])
@require_permission('delete_record')
def delete_screening_record(id):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    yp = ScreeningYearBioData.query.get(id)
    if not yp:
        return jsonify({"error": "Record not found"}), 404
    
    # Cascade delete associated diagnostic records manually
    staff_id = yp.staff_id
    year = yp.screening_year
    
    # Define diagnostic models to clean up
    models_to_clean = [
        ConsultationData, FBCResult, KFTResult, 
        LipidResult, LFTResult, SpecialTestsResult,
        DirectorReview, QueueEntry
    ]
    
    for model in models_to_clean:
        db.session.query(model).filter(
            func.lower(func.trim(model.staff_id)) == func.lower(staff_id.strip()),
            model.screening_year == year
        ).delete(synchronize_session=False)
        
    db.session.delete(yp)
    
    # Audit Log for Deletion
    audit = AuditLog(
        user_id=get_jwt_identity(),
        action='Delete Screening Record',
        resource=f"Patient:{staff_id}:Year:{year}",
        details=f"Screening record for year {year} and all associated diagnostics removed.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()
    return jsonify({"message": "Screening record and all associated diagnostics removed"}), 200

@view_data_bp.route('/patient-report/<string:staff_id>/<int:year>', methods=['GET'])
@jwt_required()
def get_patient_report(staff_id, year):
    # Authorization Check: Allow if Staff with permission OR Patient requesting their own ID
    user_id_str = get_jwt_identity()
    if not user_id_str:
        return jsonify({"error": "Authentication required"}), 401

    from models import StaffUser, PatientPortalUser
    
    is_authorized = False
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        user_id = -1
        
    # 1. Check if Staff with permission
    requester_staff = StaffUser.query.get(user_id)
    if requester_staff:
        if requester_staff.username == 'admin' or requester_staff.has_permission('view_records'):
            is_authorized = True
            
    # 2. Check if Patient requesting self
    if not is_authorized:
        requester_patient = PatientPortalUser.query.get(user_id)
        if requester_patient and requester_patient.is_verified:
            if requester_patient.username.lower() == staff_id.lower():
                is_authorized = True
                
    if not is_authorized:
        return jsonify({"error": "Access denied. You do not have permission to view this clinical record."}), 403

    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    from sqlalchemy import func
    clean_id = staff_id.strip()
    
    # Case-insensitive patient lookup
    patient = BioData.query.filter(func.lower(BioData.staff_id) == clean_id.lower()).first()
    if not patient:
        return jsonify({"error": "Patient profile not found in this section"}), 404
        
    # Case-insensitive yearly record lookup
    yearly = ScreeningYearBioData.query.filter(
        func.lower(ScreeningYearBioData.staff_id) == clean_id.lower(),
        ScreeningYearBioData.screening_year == year
    ).first()
    
    if not yearly:
        return jsonify({"error": "Clinical data not found for the selected year"}), 404
    
    # Initialize basic info
    bio_info = {
        "staff_id": patient.staff_id,
        "patient_id": yearly.patient_id if yearly else "N/A",
        "first_name": patient.first_name,
        "middle_name": patient.middle_name,
        "last_name": patient.last_name,
        "full_name": f"{patient.first_name} {patient.middle_name or ''} {patient.last_name}",
        "email": patient.email,
        "phone": patient.phone,
        "dob": patient.dob.strftime('%d/%m/%Y') if hasattr(patient.dob, 'strftime') else (str(patient.dob) if patient.dob else "N/A"),
        "age": patient.age,
        "gender": patient.gender,
        "nationality": patient.nationality,
        "department": patient.department,
        "screening_year": year
    }
    
    # Initialize results containers
    results = {
        "consultation": {},
        "fbc": {},
        "kft": {},
        "lipid": {},
        "lft": {},
        "special": {},
        "director": {}
    }
    
    c = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if c:
        results["consultation"] = {
            "bp": c.bp, "pulse": c.pulse, "spo2": c.spo2, "luts": c.luts,
            "chest": c.chest_status, "abdomen": c.abdomen, "assessment": c.overall_assessment,
            "fbs": c.fbs, "rbs": c.rbs, "sugar_remark": c.sugar_remark,
            "ua_result": c.ua_result, "ua_remark": c.ua_remark,
            "psa": c.psa, "psa_remark": c.psa_remark,
            "hx_pe": c.assessment_hx_pe, "lab_remark": c.overall_lab_remark, "breast": c.breast_exam
        }
    
    f = FBCResult.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if f:
        results["fbc"] = {
            "pcv": f.pcv, "wbc": f.wbc, "plt": f.plt, "hgb": f.hgb, "rbc": f.rbc, "remark": f.fbc_remark,
            "lymp_percent": f.lymp_percent, "gra_percent": f.gra_percent, "mid_percent": f.mid_percent
        }
    
    k = KFTResult.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if k:
        results["kft"] = {
            "potassium": k.potassium, "sodium": k.sodium, "urea": k.urea, "creatinine": k.creatinine, "hco3": k.hco3,
            "chloride": k.chloride, "remark": k.kft_remark
        }
    
    li = LipidResult.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if li:
        results["lipid"] = {
            "tcho": li.total_cholesterol, "tg": li.triglycerides, "hdl": li.hdl, "ldl": li.ldl,
            "remark": li.lp_remark
        }
    
    lf = LFTResult.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if lf:
        results["lft"] = {
            "ast": lf.ast, "alt": lf.alt, "alp": lf.alp, "tb": lf.tb, "cb": lf.cb,
            "remark": lf.lft_remark
        }
    
    s = SpecialTestsResult.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if s:
        results["special"] = {
            "ecg": s.ecg_result, "spirometry": s.spirometry_result, "audiometry": s.audiometry_result
        }

    d = DirectorReview.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if d:
        results["director"] = {
            "assessment": d.overall_assessment,
            "comment_one": d.comment_one,
            "comment_two": d.comment_two,
            "comment_three": d.comment_three,
            "comment_four": d.comment_four,
            "lab_remark": d.overall_lab_remark,
            "hx_pe": d.assessment_hx_pe
        }
    
    # Determine Timing
    reg_date_time = patient.created_at.isoformat() if patient.created_at else None
    report_date_time = d.first_submitted_at.isoformat() if (d and getattr(d, 'first_submitted_at', None)) else (d.created_at.isoformat() if d else None)
    
    # QR Verification Logic
    verification = ReportVerification.query.filter_by(staff_id=staff_id, screening_year=year, section=bind).first()
    if not verification:
        verification = ReportVerification(
            staff_id=staff_id,
            screening_year=year,
            section=bind,
            verification_code=uuid.uuid4().hex
        )
        db.session.add(verification)
        db.session.commit()
        
    # App Branding Templates
    branding = AppBranding.query.first()
    branding_data = branding.to_dict() if branding else {}
    
    return jsonify({
        "bio": bio_info,
        "results": results,
        "verification_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/verify/{verification.verification_code}",
        "verification_code": verification.verification_code,
        "timing": {
            "reg_date_time": reg_date_time,
            "report_date_time": report_date_time,
            "gen_date_time": datetime.now().isoformat()
        },
        "branding": branding_data
    }), 200

@view_data_bp.route('/public/verify/<token>', methods=['GET'])
def verify_report(token):
    verification = ReportVerification.query.filter_by(verification_code=token).first()
    if not verification:
        return jsonify({"valid": False, "error": "Invalid or forged report signature."}), 404
        
    # Fetch patient name from the correct section's BioData
    patient_name = "N/A"
    try:
        from flask import current_app
        engine = db.get_engine(current_app, bind=verification.section.lower())
        from sqlalchemy import text
        sql = text("SELECT first_name, middle_name, last_name FROM bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
        with engine.connect() as conn:
            row = conn.execute(sql, {"sid": verification.staff_id}).fetchone()
            if row:
                first, middle, last = row
                patient_name = f"{first} {middle or ''} {last}".strip().replace('  ', ' ')
    except Exception as e:
        print(f"Error fetching name for verification: {str(e)}")

    return jsonify({
        "valid": True,
        "staff_id": verification.staff_id,
        "patient_name": patient_name,
        "year": verification.screening_year,
        "section": verification.section.upper(),
        "generated_at": verification.generated_at.isoformat()
    }), 200

@view_data_bp.route('/dashboard/stats', methods=['GET'])
@require_permission('view_dashboard')
def get_dashboard_stats():
    bind = get_bind()
    year = request.args.get('year')
    if not bind or not year: return jsonify({"error": "Context missing"}), 400
    
    # 1. Recent Registrations (Last 5)
    recent = ScreeningYearBioData.query.filter_by(screening_year=year).order_by(ScreeningYearBioData.created_at.desc()).limit(5).all()
    
    # 2. Registration Metrics
    total_comprehensive = BioData.query.count()
    base_query = ScreeningYearBioData.query.filter_by(screening_year=year)
    
    from datetime import time
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    day_count = base_query.filter(ScreeningYearBioData.created_at >= today_start, ScreeningYearBioData.created_at <= today_end).count()
    
    males = base_query.filter_by(gender='Male').count()
    females = base_query.filter_by(gender='Female').count()
    
    age_40_above = base_query.filter(ScreeningYearBioData.age >= 40).count()
    age_below_40 = base_query.filter(ScreeningYearBioData.age < 40).count()
    
    # 3. Clinical Record Counts (keeping these for frontend flexibility)
    clinical_counts = {
        "consultations": ConsultationData.query.filter_by(screening_year=year).count(),
        "fbc": FBCResult.query.filter_by(screening_year=year).count(),
        "kft": KFTResult.query.filter_by(screening_year=year).count(),
        "lipid": LipidResult.query.filter_by(screening_year=year).count(),
        "lft": LFTResult.query.filter_by(screening_year=year).count(),
        "special": SpecialTestsResult.query.filter_by(screening_year=year).count()
    }
    
    return jsonify({
        "recent_registrations": [{
            "staff_id": r.staff_id,
            "patient_id": r.patient_id,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "created_at": r.created_at.isoformat() if r.created_at else None
        } for r in recent],
        "registration_stats": {
            "total_comprehensive": total_comprehensive,
            "year_total": base_query.count(),
            "today": day_count,
            "males": males,
            "females": females,
            "age_40_above": age_40_above,
            "age_below_40": age_below_40
        },
        "clinical_counts": clinical_counts
    }), 200
@view_data_bp.route('/patient/report-progress', methods=['GET'])
@jwt_required()
def get_report_progress():
    try:
        user_id_str = get_jwt_identity()
        year_param = request.args.get('year')
        
        if not user_id_str:
            return jsonify({"error": "Auth required"}), 400
            
        staff_id = None
        # Try fetching portal user first (since it's a patient endpoint mostly)
        from models import PatientPortalUser, StaffUser
        try:
            user_id = int(user_id_str)
            p_user = PatientPortalUser.query.get(user_id)
            if p_user:
                staff_id = p_user.username
            else:
                s_user = StaffUser.query.get(user_id)
                if s_user:
                    # if a staff is calling it but staff checking their own progress
                    staff_id = request.args.get('staff_id') or s_user.username
        except ValueError:
            staff_id = user_id_str

        if not staff_id:
            return jsonify({"error": "Staff ID required"}), 400
        
        year = int(year_param) if year_param else datetime.now().year
        from models import (
            ConsultationData, FBCResult, KFTResult, LipidResult, 
            LFTResult, SpecialTestsResult, DirectorReview
        )
        
        # Try to find which database has clinical data for this patient this year
        queries = {}
        found_bind = None
        for bind in ['dcp', 'dct']:
            try:
                engine = db.engines[bind]
                # Use a RAW SQL check on screening_year_bio_data as the primary anchor
                with engine.connect() as conn:
                    res = conn.execute(db.text("SELECT id FROM screening_year_bio_data WHERE staff_id = :s_id AND screening_year = :year LIMIT 1"), {"s_id": staff_id, "year": year}).fetchone()
                    if res:
                         found_bind = bind
                         break
            except Exception as e:
                print(f"Bind detection error for {bind}: {e}")
                continue

        if found_bind:
            engine = db.engines[found_bind]
            percentage, points, status, missing_fields = calculate_report_progress(staff_id, year, engine)
            
            return jsonify({
                "percentage": percentage,
                "points": points,
                "total": 42,
                "status": status,
                "year": year,
                "missing_count": len(missing_fields),
                "missing_preview": missing_fields[:5]
            }), 200

        # Fallback if no record found (Registered but no clinical data started)
        return jsonify({
            "percentage": 0,
            "points": 0,
            "total": 42,
            "status": "Registration Data Preparing",
            "year": year,
            "missing_count": 42,
            "missing_preview": []
        }), 200
    except Exception as e:
        print(f"CRITICAL PROGRESS ERROR: {e}")
        return jsonify({
            "percentage": 0,
            "points": 0,
            "total": 42,
            "status": "Registration Data Preparing",
            "year": datetime.now().year,
            "missing_count": 42,
            "missing_preview": []
        }), 200
