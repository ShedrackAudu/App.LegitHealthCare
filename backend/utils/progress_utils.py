from models import db
from datetime import datetime

def calculate_report_progress(staff_id, year, engine):
    """
    Calculates the 42-point medical report progress for a specific patient and year.
    Returns: (percentage, points, status, missing_fields)
    """
    try:
        with engine.connect() as conn:
            # Optimized single-pass query for all 42 points
            query = db.text("""
                SELECT 
                    COALESCE(d.fbs, c.fbs) as fbs, 
                    COALESCE(d.rbs, c.rbs) as rbs, 
                    COALESCE(d.fbs_rbs_remark, c.sugar_remark) as sugar_remark, 
                    COALESCE(d.ua_result, c.ua_result) as ua_result, 
                    COALESCE(d.ua_remark, c.ua_remark) as ua_remark, 
                    COALESCE(d.psa, c.psa) as psa, 
                    COALESCE(d.psa_remark, c.psa_remark) as psa_remark, 
                    COALESCE(d.bp, c.bp) as bp, 
                    COALESCE(d.pulse, c.pulse) as pulse, 
                    COALESCE(d.spo2, c.spo2) as spo2, 
                    COALESCE(d.assessment_hx_pe, c.assessment_hx_pe) as assessment_hx_pe, 
                    COALESCE(d.overall_lab_remark, c.overall_lab_remark) as overall_lab_remark, 
                    COALESCE(d.breast_exam, c.breast_exam) as breast_exam,
                    f.pcv, f.wbc, f.lymp_percent, f.gra_percent, f.mid_percent, f.plt, f.fbc_remark,
                    k.potassium, k.sodium, k.chloride, k.hco3, lf.urea, lf.creatinine, k.kft_remark,
                    li.total_cholesterol, li.triglycerides, li.hdl, li.ldl, li.lp_remark,
                    lf.ast, lf.alt, lf.alp, lf.tb, lf.cb, lf.lft_remark,
                    s.ecg_result, s.spirometry_result, s.audiometry_result,
                    d.comment_one, d.comment_two, d.comment_three, d.comment_four
                FROM screening_year_bio_data y
                LEFT JOIN consultation_data c ON y.staff_id = c.staff_id AND y.screening_year = c.screening_year
                LEFT JOIN fbc_results f ON y.staff_id = f.staff_id AND y.screening_year = f.screening_year
                LEFT JOIN kft_results k ON y.staff_id = k.staff_id AND y.screening_year = k.screening_year
                LEFT JOIN lipid_results li ON y.staff_id = li.staff_id AND y.screening_year = li.screening_year
                LEFT JOIN lft_results lf ON y.staff_id = lf.staff_id AND y.screening_year = lf.screening_year
                LEFT JOIN special_tests_results s ON y.staff_id = s.staff_id AND y.screening_year = s.screening_year
                LEFT JOIN director_reviews d ON y.staff_id = d.staff_id AND y.screening_year = d.screening_year
                WHERE y.staff_id = :s_id AND y.screening_year = :year
                LIMIT 1
            """)
            row = conn.execute(query, {"s_id": staff_id, "year": year}).fetchone()
            
            if not row:
                return 0, 0, "Registration Data Preparing", []

            points = 0
            total_possible = 42
            missing_fields = []
            
            def check_val(val, label, cat):
                if val is not None and str(val).strip() != "" and str(val).strip().lower() != "n/a":
                    return 1
                missing_fields.append({"label": label, "category": cat})
                return 0

            # Map row indices to point logic
            points += check_val(row[0], "FBS", "Sugar")
            points += check_val(row[1], "RBS", "Sugar")
            points += check_val(row[2], "Sugar Remark", "Sugar")
            points += check_val(row[3], "Urine Result", "UA")
            points += check_val(row[4], "Urine Remark", "UA")
            points += check_val(row[5], "PSA", "PSA")
            points += check_val(row[6], "PSA Remark", "PSA")
            points += check_val(row[7], "Blood Pressure", "Vitals")
            points += check_val(row[8], "Pulse Rate", "Vitals")
            points += check_val(row[9], "SPO2", "Vitals")
            points += check_val(row[10], "Hx/PE", "Clinical")
            points += check_val(row[11], "Lab Remark", "Clinical")
            points += check_val(row[12], "Breast Exam", "Clinical")

            # FBC
            points += check_val(row[13], "PCV", "FBC")
            points += check_val(row[14], "WBC", "FBC")
            points += check_val(row[15], "Lymphocytes", "FBC")
            points += check_val(row[16], "Neutrophils", "FBC")
            points += check_val(row[17], "Mixed Cells", "FBC")
            points += check_val(row[18], "Platelets", "FBC")
            points += check_val(row[19], "FBC Remark", "FBC")

            # KFT
            points += check_val(row[20], "Potassium", "KFT")
            points += check_val(row[21], "Sodium", "KFT")
            points += check_val(row[22], "Chloride", "KFT")
            points += check_val(row[23], "Bicarbonate", "KFT")
            points += check_val(row[24], "Urea", "LFT")
            points += check_val(row[25], "Creatinine", "LFT")
            points += check_val(row[26], "KFT Remark", "KFT")

            # Lipid
            points += check_val(row[27], "Total Chol.", "Lipid")
            points += check_val(row[28], "Triglycerides", "Lipid")
            points += check_val(row[29], "HDL-c", "Lipid")
            points += check_val(row[30], "LDL-c", "Lipid")
            points += check_val(row[31], "Lipid Remark", "Lipid")

            # LFT
            points += check_val(row[32], "AST", "LFT")
            points += check_val(row[33], "ALT", "LFT")
            points += check_val(row[34], "ALP", "LFT")
            points += check_val(row[35], "TB", "LFT")
            points += check_val(row[36], "CB", "LFT")
            points += check_val(row[37], "LFT Remark", "LFT")

            # Special
            points += check_val(row[38], "ECG", "Special")
            points += check_val(row[39], "Spirometry", "Special")
            points += check_val(row[40], "Audiometry", "Special")

            # Final Advice
            has_comment = 1 if (row[41] or row[42] or row[43] or row[44]) else 0
            points += has_comment
            if not has_comment:
                missing_fields.append({"label": "Medical Advice", "category": "Review"})

            percentage = round((points / total_possible) * 100)
            
            status = "Registration Only"
            if points > 1: status = "Lab Testing Stage"
            if points > 15: status = "Diagnostic Stage"
            if points > 31: status = "Medical Review Stage"
            if points >= 41 and not has_comment: status = "Awaiting Final Advice"
            if percentage == 100: status = "Report Ready"

            return percentage, points, status, missing_fields
    except Exception as e:
        print(f"PROGRESS CALCULATION ERROR: {e}")
        return 0, 0, "Error", []

def calculate_batch_progress(staff_ids, year, engine):
    """
    Calculates progress for a batch of staff_ids in a single query.
    Returns: a dict mapping staff_id to (percentage, points, status, missing_fields)
    """
    if not staff_ids:
        return {}
        
    results = {}
    try:
        staff_ids_list = list(set(str(sid) for sid in staff_ids if sid))
        if not staff_ids_list:
            return {}
            
        # Initialize default values for all requested staff_ids
        for sid in staff_ids:
            results[sid] = (0, 0, "Registration Data Preparing", [])
            
        placeholders = ", ".join(f":sid_{i}" for i in range(len(staff_ids_list)))
        sql = f"""
            SELECT 
                y.staff_id,
                COALESCE(d.fbs, c.fbs) as fbs, 
                COALESCE(d.rbs, c.rbs) as rbs, 
                COALESCE(d.fbs_rbs_remark, c.sugar_remark) as sugar_remark, 
                COALESCE(d.ua_result, c.ua_result) as ua_result, 
                COALESCE(d.ua_remark, c.ua_remark) as ua_remark, 
                COALESCE(d.psa, c.psa) as psa, 
                COALESCE(d.psa_remark, c.psa_remark) as psa_remark, 
                COALESCE(d.bp, c.bp) as bp, 
                COALESCE(d.pulse, c.pulse) as pulse, 
                COALESCE(d.spo2, c.spo2) as spo2, 
                COALESCE(d.assessment_hx_pe, c.assessment_hx_pe) as assessment_hx_pe, 
                COALESCE(d.overall_lab_remark, c.overall_lab_remark) as overall_lab_remark, 
                COALESCE(d.breast_exam, c.breast_exam) as breast_exam,
                f.pcv, f.wbc, f.lymp_percent, f.gra_percent, f.mid_percent, f.plt, f.fbc_remark,
                k.potassium, k.sodium, k.chloride, k.hco3, lf.urea, lf.creatinine, k.kft_remark,
                li.total_cholesterol, li.triglycerides, li.hdl, li.ldl, li.lp_remark,
                lf.ast, lf.alt, lf.alp, lf.tb, lf.cb, lf.lft_remark,
                s.ecg_result, s.spirometry_result, s.audiometry_result,
                d.comment_one, d.comment_two, d.comment_three, d.comment_four
            FROM screening_year_bio_data y
            LEFT JOIN consultation_data c ON y.staff_id = c.staff_id AND y.screening_year = c.screening_year
            LEFT JOIN fbc_results f ON y.staff_id = f.staff_id AND y.screening_year = f.screening_year
            LEFT JOIN kft_results k ON y.staff_id = k.staff_id AND y.screening_year = k.screening_year
            LEFT JOIN lipid_results li ON y.staff_id = li.staff_id AND y.screening_year = li.screening_year
            LEFT JOIN lft_results lf ON y.staff_id = lf.staff_id AND y.screening_year = lf.screening_year
            LEFT JOIN special_tests_results s ON y.staff_id = s.staff_id AND y.screening_year = s.screening_year
            LEFT JOIN director_reviews d ON y.staff_id = d.staff_id AND y.screening_year = d.screening_year
            WHERE y.screening_year = :year AND y.staff_id IN ({placeholders})
        """
        
        params = {"year": year}
        for i, sid in enumerate(staff_ids_list):
            params[f"sid_{i}"] = sid
            
        with engine.connect() as conn:
            rows = conn.execute(db.text(sql), params).fetchall()
            
            for row in rows:
                sid = row[0]
                points = 0
                total_possible = 42
                missing_fields = []
                
                def check_val(val, label, cat):
                    if val is not None and str(val).strip() != "" and str(val).strip().lower() != "n/a":
                        return 1
                    missing_fields.append({"label": label, "category": cat})
                    return 0
                
                # Offset by 1 since row[0] is staff_id
                points += check_val(row[1], "FBS", "Sugar")
                points += check_val(row[2], "RBS", "Sugar")
                points += check_val(row[3], "Sugar Remark", "Sugar")
                points += check_val(row[4], "Urine Result", "UA")
                points += check_val(row[5], "Urine Remark", "UA")
                points += check_val(row[6], "PSA", "PSA")
                points += check_val(row[7], "PSA Remark", "PSA")
                points += check_val(row[8], "Blood Pressure", "Vitals")
                points += check_val(row[9], "Pulse Rate", "Vitals")
                points += check_val(row[10], "SPO2", "Vitals")
                points += check_val(row[11], "Hx/PE", "Clinical")
                points += check_val(row[12], "Lab Remark", "Clinical")
                points += check_val(row[13], "Breast Exam", "Clinical")

                # FBC
                points += check_val(row[14], "PCV", "FBC")
                points += check_val(row[15], "WBC", "FBC")
                points += check_val(row[16], "Lymphocytes", "FBC")
                points += check_val(row[17], "Neutrophils", "FBC")
                points += check_val(row[18], "Mixed Cells", "FBC")
                points += check_val(row[19], "Platelets", "FBC")
                points += check_val(row[20], "FBC Remark", "FBC")

                # KFT
                points += check_val(row[21], "Potassium", "KFT")
                points += check_val(row[22], "Sodium", "KFT")
                points += check_val(row[23], "Chloride", "KFT")
                points += check_val(row[24], "Bicarbonate", "KFT")
                points += check_val(row[25], "Urea", "LFT")
                points += check_val(row[26], "Creatinine", "LFT")
                points += check_val(row[27], "KFT Remark", "KFT")

                # Lipid
                points += check_val(row[28], "Total Chol.", "Lipid")
                points += check_val(row[29], "Triglycerides", "Lipid")
                points += check_val(row[30], "HDL-c", "Lipid")
                points += check_val(row[31], "LDL-c", "Lipid")
                points += check_val(row[32], "Lipid Remark", "Lipid")

                # LFT
                points += check_val(row[33], "AST", "LFT")
                points += check_val(row[34], "ALT", "LFT")
                points += check_val(row[35], "ALP", "LFT")
                points += check_val(row[36], "TB", "LFT")
                points += check_val(row[37], "CB", "LFT")
                points += check_val(row[38], "LFT Remark", "LFT")

                # Special
                points += check_val(row[39], "ECG", "Special")
                points += check_val(row[40], "Spirometry", "Special")
                points += check_val(row[41], "Audiometry", "Special")

                # Final Advice
                has_comment = 1 if (row[42] or row[43] or row[44] or row[45]) else 0
                points += has_comment
                if not has_comment:
                    missing_fields.append({"label": "Medical Advice", "category": "Review"})

                percentage = round((points / total_possible) * 100)
                
                status = "Registration Only"
                if points > 1: status = "Lab Testing Stage"
                if points > 15: status = "Diagnostic Stage"
                if points > 31: status = "Medical Review Stage"
                if points >= 41 and not has_comment: status = "Awaiting Final Advice"
                if percentage == 100: status = "Report Ready"

                results[sid] = (percentage, points, status, missing_fields)
    except Exception as e:
        print(f"BATCH PROGRESS CALCULATION ERROR: {e}")
        
    return results

def validate_tracked_parameters(staff_id, screening_year, mode='comments', overrides=None):
    """
    Validates whether all tracked progress parameters are present for a patient.
    mode: 'comments' -> checks all 41 tracked parameters (including overall_lab_remark, excluding comments)
          'lab_remark' -> checks 40 tracked parameters (excluding comments and overall_lab_remark)
    overrides: dict of fields passed in the request payload (if any)
    
    Returns: (is_valid: bool, missing_labels: list of str, resolved_values: dict)
    """
    from models import ConsultationData, DirectorReview, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult
    
    overrides = overrides or {}
    try:
        year_int = int(screening_year) if screening_year is not None else None
    except (ValueError, TypeError):
        year_int = screening_year

    consult = None
    review = None
    fbc = None
    kft = None
    lipid = None
    lft = None
    special = None

    if year_int:
        consult = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        review = DirectorReview.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        fbc = FBCResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        kft = KFTResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        lipid = LipidResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        lft = LFTResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
        special = SpecialTestsResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()

    def is_present(val):
        if val is None:
            return False
        s = str(val).strip()
        if not s or s.lower() in ['n/a', 'none', 'null', 'undefined']:
            return False
        return True

    def get_val(field_name, *db_objs):
        if field_name in overrides and is_present(overrides[field_name]):
            return overrides[field_name]
        for obj in db_objs:
            if obj and hasattr(obj, field_name):
                val = getattr(obj, field_name)
                if is_present(val):
                    return val
        return None

    def get_first_present(*vals):
        for v in vals:
            if is_present(v):
                return v
        return vals[0] if vals else None

    # Construct resolved values dictionary ensuring identical resolution order for validation and prompts
    resolved = {
        "fbs": get_val("fbs", review, consult),
        "rbs": get_val("rbs", review, consult),
        "sugar_remark": get_first_present(get_val("sugar_remark", review, consult), get_val("fbs_rbs_remark", review, consult)),
        "ua_result": get_val("ua_result", review, consult),
        "ua_remark": get_val("ua_remark", review, consult),
        "ua_remark_others": get_val("ua_remark_others", review, consult),
        "psa": get_val("psa", review, consult),
        "psa_remark": get_val("psa_remark", review, consult),
        "bp": get_val("bp", review, consult),
        "pulse": get_val("pulse", review, consult),
        "spo2": get_val("spo2", review, consult),
        "assessment_hx_pe": get_val("assessment_hx_pe", review, consult),
        "overall_lab_remark": get_val("overall_lab_remark", review, consult),
        "breast_exam": get_val("breast_exam", review, consult),
        "breast_remark": get_val("breast_remark", review, consult),
        "breast_others": get_val("breast_others", review, consult),
        "abdomen": get_val("abdomen", review, consult),
        "abdomen_others": get_val("abdomen_others", review, consult),
        "luts": get_val("luts", review, consult),
        "chronic_cough": get_val("chronic_cough", review, consult),
        "chronic_chest_pain": get_val("chronic_chest_pain", review, consult),
        "chest_infection": get_val("chest_infection", review, consult),
        "heart_dx": get_val("heart_dx", review, consult),
        "palor": get_val("palor", review, consult),
        "jaundice": get_val("jaundice", review, consult),
        "murmur": get_val("murmur", review, consult),
        "chest_status": get_val("chest_status", review, consult),
        "hs_status": get_val("hs_status", review, consult),
        "dm_status": get_val("dm_status", review, consult),
        "htn_status": get_val("htn_status", review, consult),
        "other_assessments": get_val("other_assessments", review, consult),
        "overall_assessment": get_val("overall_assessment", review, consult),
        "other_remarks": get_val("other_remarks", review, consult),
        
        # FBC
        "pcv": get_val("pcv", fbc),
        "wbc": get_val("wbc", fbc),
        "lymp_percent": get_val("lymp_percent", fbc),
        "gra_percent": get_val("gra_percent", fbc),
        "mid_percent": get_val("mid_percent", fbc),
        "plt": get_val("plt", fbc),
        "fbc_remark": get_val("fbc_remark", fbc),
        
        # KFT
        "potassium": get_val("potassium", kft),
        "sodium": get_val("sodium", kft),
        "chloride": get_val("chloride", kft),
        "hco3": get_first_present(get_val("hco3", kft), get_val("bicarbonate_ca", kft)),
        "urea": get_first_present(get_val("urea", lft), get_val("urea", kft)),
        "creatinine": get_first_present(get_val("creatinine", lft), get_val("creatinine", kft)),
        "kft_remark": get_val("kft_remark", kft),
        
        # Lipid
        "total_cholesterol": get_val("total_cholesterol", lipid),
        "triglycerides": get_val("triglycerides", lipid),
        "hdl": get_val("hdl", lipid),
        "ldl": get_val("ldl", lipid),
        "lp_remark": get_val("lp_remark", lipid),
        
        # LFT
        "ast": get_val("ast", lft),
        "alt": get_val("alt", lft),
        "alp": get_val("alp", lft),
        "tb": get_val("tb", lft),
        "cb": get_val("cb", lft),
        "lft_remark": get_val("lft_remark", lft),
        
        # Special
        "ecg_result": get_val("ecg_result", special),
        "ecg_remark": get_val("ecg_remark", special),
        "spirometry_result": get_val("spirometry_result", special),
        "spirometry_remark": get_val("spirometry_remark", special),
        "audiometry_result": get_val("audiometry_result", special),
        "audiometry_remark": get_val("audiometry_remark", special),
        "weight": get_val("weight", special),
        "height": get_val("height", special),
    }

    missing = []
    def check(val, label):
        if not is_present(val):
            missing.append(label)

    # Sugar (3)
    check(resolved["fbs"], "FBS")
    check(resolved["rbs"], "RBS")
    check(resolved["sugar_remark"], "Sugar Remark")

    # UA (2)
    check(resolved["ua_result"], "Urine Result")
    check(resolved["ua_remark"], "Urine Remark")

    # PSA (2)
    check(resolved["psa"], "PSA")
    check(resolved["psa_remark"], "PSA Remark")

    # Vitals (3)
    check(resolved["bp"], "Blood Pressure")
    check(resolved["pulse"], "Pulse Rate")
    check(resolved["spo2"], "SPO2")

    # Clinical (3)
    check(resolved["assessment_hx_pe"], "Hx/PE")
    if mode == 'comments':
        check(resolved["overall_lab_remark"], "Lab Remark")
    check(resolved["breast_exam"], "Breast Exam")

    # FBC (7)
    check(resolved["pcv"], "PCV")
    check(resolved["wbc"], "WBC")
    check(resolved["lymp_percent"], "Lymphocytes")
    check(resolved["gra_percent"], "Neutrophils")
    check(resolved["mid_percent"], "Mixed Cells")
    check(resolved["plt"], "Platelets")
    check(resolved["fbc_remark"], "FBC Remark")

    # KFT (7)
    check(resolved["potassium"], "Potassium")
    check(resolved["sodium"], "Sodium")
    check(resolved["chloride"], "Chloride")
    check(resolved["hco3"], "Bicarbonate")
    check(resolved["urea"], "Urea")
    check(resolved["creatinine"], "Creatinine")
    check(resolved["kft_remark"], "KFT Remark")

    # Lipid (5)
    check(resolved["total_cholesterol"], "Total Chol.")
    check(resolved["triglycerides"], "Triglycerides")
    check(resolved["hdl"], "HDL-c")
    check(resolved["ldl"], "LDL-c")
    check(resolved["lp_remark"], "Lipid Remark")

    # LFT (6)
    check(resolved["ast"], "AST")
    check(resolved["alt"], "ALT")
    check(resolved["alp"], "ALP")
    check(resolved["tb"], "TB")
    check(resolved["cb"], "CB")
    check(resolved["lft_remark"], "LFT Remark")

    # Special (3)
    check(resolved["ecg_result"], "ECG")
    check(resolved["spirometry_result"], "Spirometry")
    check(resolved["audiometry_result"], "Audiometry")

    return len(missing) == 0, missing, resolved

