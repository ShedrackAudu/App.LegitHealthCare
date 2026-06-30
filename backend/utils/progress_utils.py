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
