from flask import Blueprint, request, jsonify
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

view_data_bp = Blueprint('view_data', __name__)

@view_data_bp.route('/patients/search', methods=['GET'])
@require_permission('view_patients')
def search_patients():
    query = request.args.get('q', '')
    if len(query) < 2: return jsonify([]), 200
    
    search = f"%{query}%"
    
    results_map = {} # Keyed by staff_id for merging
    
    def process_record(data):
        s_id = data.get('staff_id')
        if not s_id: return
        
        # Clean up data (especially dob)
        if data.get('dob') and hasattr(data['dob'], 'isoformat'):
            data['dob'] = data['dob'].isoformat()
            
        if s_id not in results_map:
            results_map[s_id] = data
        else:
            # Merge: fill in missing fields in existing with values from data
            existing = results_map[s_id]
            for k, v in data.items():
                # If existing field is missing/empty and new field has value, fill it
                if v and not existing.get(k):
                    existing[k] = v

    # 1. Start with global BioData search
    try:
        patients_global = BioData.query.filter(
            (BioData.staff_id.ilike(search)) |
            (BioData.first_name.ilike(search)) |
            (BioData.last_name.ilike(search))
        ).limit(20).all()
        
        for p in patients_global:
            # NEW: Pull patient_id from the most recent screening record within current section
            yearly_record = ScreeningYearBioData.query.filter_by(staff_id=p.staff_id).order_by(ScreeningYearBioData.screening_year.desc()).first()
            p_id = yearly_record.patient_id if yearly_record else None

            p_dict = {
                "staff_id": p.staff_id, "patient_id": p_id, "first_name": p.first_name, 
                "middle_name": p.middle_name, "last_name": p.last_name, "department": p.department, 
                "gender": p.gender, "dob": p.dob, "age": p.age, "phone": p.phone, "email": p.email,
                "race": p.race, "nationality": p.nationality
            }
            process_record(p_dict)
    except Exception as e:
        print(f"Global search error: {e}")

    # REMOVED: Sectional search over ['dcp', 'dct'] to enforce isolation.
    # The routed BioData.query above already searches the correct sectional database.

    # Convert map back to list and limit to 10
    final_results = list(results_map.values())[:10]
    
    # Final cleanup: calculate age if missing but dob exists (optional enhancement)
    return jsonify(final_results), 200

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@view_data_bp.route('/patients/all', methods=['GET'])
@require_permission('view_patients')
def get_all_patients():
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    patients = BioData.query.order_by(BioData.created_at.desc()).all()
    return jsonify([{
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
        "nationality": p.nationality
    } for p in patients]), 200

@view_data_bp.route('/patients/<staff_id>', methods=['PUT', 'DELETE'])
@require_permission('view_patients')
def handle_patient(staff_id):
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
            user_id=request.headers.get('X-User-ID'),
            action='Delete Patient (Full)',
            resource=f"Patient:{clean_staff_id}",
            details=f"Patient {patient.first_name} {patient.last_name} and all data deleted.",
            ip_address=request.remote_addr
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
        ScreeningYearBioData.query.filter(func.lower(ScreeningYearBioData.staff_id) == func.lower(clean_staff_id)).update({
            "first_name": first_name,
            "last_name": last_name
        }, synchronize_session=False)
        
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
                user_id=request.headers.get('X-User-ID'),
                action='Update Patient Profile',
                resource=f"Patient:{patient.staff_id}",
                details=f"Updated profile for {patient.first_name} {patient.last_name}.",
                ip_address=request.remote_addr
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
            "comment_four": dr.comment_four
        }
            
        results.append(record)
        
    return jsonify({
        "records": results,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200

@view_data_bp.route('/records/screening/<int:id>', methods=['DELETE'])
@require_permission('view_records')
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
        user_id=request.headers.get('X-User-ID'),
        action='Delete Screening Record',
        resource=f"Patient:{staff_id}:Year:{year}",
        details=f"Screening record for year {year} and all associated diagnostics removed.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()
    return jsonify({"message": "Screening record and all associated diagnostics removed"}), 200

@view_data_bp.route('/patient-report/<staff_id>/<int:year>', methods=['GET'])
@require_permission('view_records')
def get_patient_report(staff_id, year):
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
            "comment_four": d.comment_four
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
        "verification_url": f"http://localhost:5173/verify/{verification.verification_code}",
        "verification_code": verification.verification_code,
        "timing": {
            "reg_date_time": reg_date_time,
            "report_date_time": report_date_time,
            "gen_date_time": datetime.utcnow().isoformat()
        },
        "branding": branding_data
    }), 200

@view_data_bp.route('/public/verify/<token>', methods=['GET'])
def verify_report(token):
    verification = ReportVerification.query.filter_by(verification_code=token).first()
    if not verification:
        return jsonify({"valid": False, "error": "Invalid or forged report signature."}), 404
        
    return jsonify({
        "valid": True,
        "staff_id": verification.staff_id,
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
    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    today_end = datetime.combine(datetime.utcnow().date(), time.max)
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
def get_report_progress():
    try:
        staff_id = request.headers.get('X-Staff-ID')
        if not staff_id:
            return jsonify({"error": "Staff ID required"}), 400
        
        year = datetime.utcnow().year
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
                # Use a RAW SQL check to be 100% sure we don't trigger model/session bind issues during detection
                with engine.connect() as conn:
                    res = conn.execute(db.text("SELECT id FROM consultation_data WHERE staff_id = :s_id AND screening_year = :year LIMIT 1"), {"s_id": staff_id, "year": year}).fetchone()
                    if res:
                         found_bind = bind
                         break
            except:
                continue

        if found_bind:
            engine = db.engines[found_bind]
            # Use the explicit bind on the query object
            queries = {
                 'c': db.session.query(ConsultationData).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 'f': db.session.query(FBCResult).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 'k': db.session.query(KFTResult).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 'li': db.session.query(LipidResult).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 'lf': db.session.query(LFTResult).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 's': db.session.query(SpecialTestsResult).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first(),
                 'd': db.session.query(DirectorReview).bind(engine).filter_by(staff_id=staff_id, screening_year=year).first()
            }

        # 42 Point Logic Check
        points = 0
        total_possible = 42
        missing_fields = []
        
        def check_field(val, label, cat):
            if val is not None and str(val).strip() != "" and str(val).strip().lower() != "n/a":
                return 1
            missing_fields.append({"label": label, "category": cat})
            return 0

        c = queries.get('c')
        f = queries.get('f')
        k = queries.get('k')
        li = queries.get('li')
        lf = queries.get('lf')
        s = queries.get('s')
        d = queries.get('d')

        # 1. Consultation (Vitals + clinical)
        points += check_field(c.fbs if c else None, "FBS", "Blood Sugar")
        points += check_field(c.rbs if c else None, "RBS", "Blood Sugar")
        points += check_field(c.sugar_remark if c else None, "Sugar Remark", "Blood Sugar")
        points += check_field(c.ua_result if c else None, "Urine Result", "UA")
        points += check_field(c.ua_remark if c else None, "Urine Remark", "UA")
        points += check_field(c.psa if c else None, "PSA", "PSA")
        points += check_field(c.psa_remark if c else None, "PSA Remark", "PSA")
        points += check_field(c.bp if c else None, "Blood Pressure", "Vitals")
        points += check_field(c.pulse if c else None, "Pulse Rate", "Vitals")
        points += check_field(c.spo2 if c else None, "SPO2", "Vitals")
        points += check_field(c.assessment_hx_pe if c else None, "Hx/PE", "Clinical")
        points += check_field(c.overall_lab_remark if c else None, "Lab Remark", "Clinical")
        points += check_field(c.breast_exam if c else None, "Breast Exam", "Clinical")

        # 2. FBC
        points += check_field(f.pcv if f else None, "PCV", "FBC")
        points += check_field(f.wbc if f else None, "WBC", "FBC")
        points += check_field(f.lymp_percent if f else None, "Lymphocytes", "FBC")
        points += check_field(f.gra_percent if f else None, "Neutrophils", "FBC")
        points += check_field(f.mid_percent if f else None, "Mixed", "FBC")
        points += check_field(f.plt if f else None, "Platelets", "FBC")
        points += check_field(f.fbc_remark if f else None, "FBC Remark", "FBC")

        # 3. KFT
        points += check_field(k.potassium if k else None, "Potassium", "KFT")
        points += check_field(k.sodium if k else None, "Sodium", "KFT")
        points += check_field(k.chloride if k else None, "Chloride", "KFT")
        points += check_field(k.hco3 if k else None, "Bicarbonate", "KFT")
        points += check_field(k.urea if k else None, "Urea", "KFT")
        points += check_field(k.creatinine if k else None, "Creatinine", "KFT")
        points += check_field(k.kft_remark if k else None, "KFT Remark", "KFT")

        # 4. Lipid
        points += check_field(li.total_cholesterol if li else None, "Total Cholesterol", "Lipid")
        points += check_field(li.triglycerides if li else None, "Triglycerides", "Lipid")
        points += check_field(li.hdl if li else None, "HDL-c", "Lipid")
        points += check_field(li.ldl if li else None, "LDL-c", "Lipid")
        points += check_field(li.lp_remark if li else None, "Lipid Remark", "Lipid")

        # 5. LFT
        points += check_field(lf.ast if lf else None, "AST", "LFT")
        points += check_field(lf.alt if lf else None, "ALT", "LFT")
        points += check_field(lf.alp if lf else None, "ALP", "LFT")
        points += check_field(lf.tb if lf else None, "TB", "LFT")
        points += check_field(lf.cb if lf else None, "CB", "LFT")
        points += check_field(lf.lft_remark if lf else None, "LFT Remark", "LFT")

        # 6. Special
        points += check_field(s.ecg_result if s else None, "ECG", "Special")
        points += check_field(s.spirometry_result if s else None, "Spirometry", "Special")
        points += check_field(s.audiometry_result if s else None, "Audiometry", "Special")

        # 7. Comments (1 point logic)
        has_comment = 0
        if d and (d.comment_one or d.comment_two or d.comment_three or d.comment_four):
            has_comment = 1
        
        points += has_comment
        if not has_comment:
            missing_fields.append({"label": "Final Medical Advice", "category": "Review"})

        percentage = round((points / total_possible) * 100) if points > 0 else 0
        
        # Dynamic status labels
        status = "Registration Only"
        if points > 1: status = "Lab Testing In Progress"
        if points > 15: status = "Diagnostic Stage"
        if points > 31: status = "Medical Review Stage"
        if points >= 41 and not has_comment: status = "Awaiting Final Advice"
        if percentage == 100: status = "Report Ready"

        return jsonify({
            "percentage": percentage,
            "points": points,
            "total": total_possible,
            "status": status,
            "year": year,
            "missing_count": len(missing_fields),
            "missing_preview": missing_fields[:5]
        }), 200
    except Exception as e:
        print(f"CRITICAL PROGRESS ERROR: {e}")
        return jsonify({
            "percentage": 0,
            "points": 0,
            "total": 42,
            "status": "Registration Data Preparing",
            "year": datetime.utcnow().year,
            "missing_count": 42,
            "missing_preview": []
        }), 200
