import sys

with open(r'c:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare WebApp\App.LegitHealthCare\backend\routes\admin_bp.py', 'r', encoding='utf-8') as f:
    lines = f.read()

old_code = r'''            # Complete Unified Schema Initialization
            row = {
                "Staff ID": yp.staff_id, "Patient ID": yp.patient_id, "First Name": yp.first_name, "Last Name": yp.last_name, 
                "Year": yp.screening_year, "Section": context, "Registered_Date": yp.created_at.strftime('%Y-%m-%d %H:%M') if yp.created_at else "",
                "BIO_Middle_Name": "", "BIO_Gender": "", "BIO_Age": "", "BIO_DOB": "", "BIO_Phone": "", "BIO_Email": "", 
                "BIO_Department": "", "BIO_Race": "", "BIO_Nationality": "",
                "CLINIC_BP": "", "CLINIC_Pulse": "", "CLINIC_SPO2": "", "CLINIC_HS": "", "CLINIC_Palor": "", "CLINIC_Jaundice": "", 
                "CLINIC_Murmur": "", "CLINIC_Chest_Status": "", "CLINIC_LUTS": "", "CLINIC_Chronic_Cough": "", "CLINIC_Chest_Pain": "", 
                "CLINIC_Chest_Infection": "", "CLINIC_Heart_Dx": "", "CLINIC_DM_Status": "", "CLINIC_HTN_Status": "", "CLINIC_PSA": "", 
                "CLINIC_PSA_Remark": "", "CLINIC_FBS": "", "CLINIC_RBS": "", "CLINIC_Sugar_Remark": "", "CLINIC_UA_Result": "", 
                "CLINIC_UA_Remark": "", "CLINIC_Breast_Exam": "", "CLINIC_Breast_Remark": "", "CLINIC_Abdomen": "", 
                "CLINIC_Assessment_HX_PE": "", "CLINIC_Lab_Remarks": "", "CLINIC_Other_Assessments": "", "CLINIC_Other_Remarks": "", 
                "CLINIC_Overall_Assessment": "", "CLINIC_Consulted_By": "", "CLINIC_Date": "",
                "LAB_FBC_PCV": "", "LAB_FBC_WBC": "", "LAB_FBC_HGB": "", "LAB_FBC_PLT": "", "LAB_FBC_RBC": "", 
                "LAB_FBC_LYMP_PCT": "", "LAB_FBC_LYMP_ABS": "", "LAB_FBC_GRA_PCT": "", "LAB_FBC_GRA_ABS": "", 
                "LAB_FBC_MID_PCT": "", "LAB_FBC_MID_ABS": "", "LAB_FBC_MCV": "", "LAB_FBC_MCH": "", "LAB_FBC_MCHC": "", 
                "LAB_FBC_RDW": "", "LAB_FBC_PDW": "", "LAB_FBC_Remark": "", "LAB_FBC_Others": "",
                "LAB_KFT_Potassium": "", "LAB_KFT_Sodium": "", "LAB_KFT_Chloride": "", "LAB_KFT_Urea": "", 
                "LAB_KFT_Creatinine": "", "LAB_KFT_Bicarbonate": "", "LAB_KFT_HCO3": "", "LAB_KFT_Remark": "", "LAB_KFT_Others": "",
                "LAB_LIPID_TCHO": "", "LAB_LIPID_TG": "", "LAB_LIPID_HDL": "", "LAB_LIPID_LDL": "", "LAB_LIPID_Remark": "", "LAB_LIPID_Others": "",
                "LAB_LFT_AST": "", "LAB_LFT_ALT": "", "LAB_LFT_ALP": "", "LAB_LFT_TB": "", "LAB_LFT_CB": "", "LAB_LFT_Remark": "", "LAB_LFT_Others": "",
                "SPECIAL_ECG": "", "SPECIAL_ECG_Remark": "", "SPECIAL_Spirometry": "", "SPECIAL_Spirometry_Remark": "", 
                "SPECIAL_Audiometry": "", "SPECIAL_Audiometry_Remark": "", "SPECIAL_Weight": "", "SPECIAL_Height": "",
                "DIRECTOR_DM": "", "DIRECTOR_HTN": "", "DIRECTOR_BP": "", "DIRECTOR_Pulse": "", "DIRECTOR_SPO2": "", 
                "DIRECTOR_HS": "", "DIRECTOR_LUTS": "", "DIRECTOR_Chronic_Cough": "", "DIRECTOR_Chest_Pain": "", 
                "DIRECTOR_Chest_Infection": "", "DIRECTOR_Heart_Dx": "", "DIRECTOR_Palor": "", "DIRECTOR_Jaundice": "", 
                "DIRECTOR_Murmur": "", "DIRECTOR_Chest_Status": "", "DIRECTOR_Breast": "", "DIRECTOR_Breast_Remark": "", 
                "DIRECTOR_Abdomen": "", "DIRECTOR_PSA": "", "DIRECTOR_PSA_Remark": "", "DIRECTOR_FBS": "", "DIRECTOR_RBS": "", 
                "DIRECTOR_Sugar_Remark": "", "DIRECTOR_UA_Result": "", "DIRECTOR_UA_Remark": "", "DIRECTOR_Assessment_HX_PE": "", 
                "DIRECTOR_Overall_Lab_Remark": "", "DIRECTOR_Other_Assessments": "", "DIRECTOR_Other_Remarks": "", 
                "DIRECTOR_Comm1": "", "DIRECTOR_Comm2": "", "DIRECTOR_Comm3": "", "DIRECTOR_Comm4": "", 
                "DIRECTOR_Final_Assessment": "", "DIRECTOR_Review_Date": ""
            }
            
            bio = BioData.query.filter_by(staff_id=yp.staff_id).first()
            if bio:
                row.update({ "BIO_Middle_Name": getattr(bio, 'middle_name', ''), "BIO_Gender": getattr(bio, 'gender', ''), "BIO_Age": getattr(bio, 'age', ''), "BIO_DOB": getattr(bio, 'dob').strftime('%Y-%m-%d') if getattr(bio, 'dob', None) else '', "BIO_Phone": getattr(bio, 'phone', ''), "BIO_Email": getattr(bio, 'email', ''), "BIO_Department": getattr(bio, 'department', ''), "BIO_Race": getattr(bio, 'race', ''), "BIO_Nationality": getattr(bio, 'nationality', '') })
                
            c = ConsultationData.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if c:
                row.update({ "CLINIC_BP": c.bp, "CLINIC_Pulse": c.pulse, "CLINIC_SPO2": c.spo2, "CLINIC_HS": c.hs_status, "CLINIC_Palor": c.palor, "CLINIC_Jaundice": c.jaundice, "CLINIC_Murmur": c.murmur, "CLINIC_Chest_Status": c.chest_status, "CLINIC_LUTS": c.luts, "CLINIC_Chronic_Cough": c.chronic_cough, "CLINIC_Chest_Pain": c.chronic_chest_pain, "CLINIC_Chest_Infection": c.chest_infection, "CLINIC_Heart_Dx": c.heart_dx, "CLINIC_DM_Status": c.dm_status, "CLINIC_HTN_Status": c.htn_status, "CLINIC_PSA": c.psa, "CLINIC_PSA_Remark": c.psa_remark, "CLINIC_FBS": c.fbs, "CLINIC_RBS": c.rbs, "CLINIC_Sugar_Remark": c.sugar_remark, "CLINIC_UA_Result": c.ua_result, "CLINIC_UA_Remark": c.ua_remark, "CLINIC_Breast_Exam": c.breast_exam, "CLINIC_Breast_Remark": c.breast_remark, "CLINIC_Abdomen": c.abdomen, "CLINIC_Assessment_HX_PE": c.assessment_hx_pe, "CLINIC_Lab_Remarks": c.overall_lab_remark, "CLINIC_Other_Assessments": c.other_assessments, "CLINIC_Other_Remarks": c.other_remarks, "CLINIC_Overall_Assessment": c.overall_assessment, "CLINIC_Consulted_By": c.consulted_by_name, "CLINIC_Date": c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else '' })
                
            f = FBCResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if f:
                row.update({ "LAB_FBC_PCV": f.pcv, "LAB_FBC_WBC": f.wbc, "LAB_FBC_HGB": f.hgb, "LAB_FBC_PLT": f.plt, "LAB_FBC_RBC": f.rbc, "LAB_FBC_LYMP_PCT": f.lymp_percent, "LAB_FBC_LYMP_ABS": f.lymp_abs, "LAB_FBC_GRA_PCT": f.gra_percent, "LAB_FBC_GRA_ABS": f.gra_abs, "LAB_FBC_MID_PCT": f.mid_percent, "LAB_FBC_MID_ABS": f.mid_abs, "LAB_FBC_MCV": f.mcv, "LAB_FBC_MCH": f.mch, "LAB_FBC_MCHC": f.mchc, "LAB_FBC_RDW": f.rdw, "LAB_FBC_PDW": f.pdw, "LAB_FBC_Remark": f.fbc_remark, "LAB_FBC_Others": f.other_remarks })
                
            k = KFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if k:
                row.update({ "LAB_KFT_Potassium": k.potassium, "LAB_KFT_Sodium": k.sodium, "LAB_KFT_Chloride": k.chloride, "LAB_KFT_Urea": k.urea, "LAB_KFT_Creatinine": k.creatinine, "LAB_KFT_Bicarbonate": k.bicarbonate_ca, "LAB_KFT_HCO3": k.hco3, "LAB_KFT_Remark": k.kft_remark, "LAB_KFT_Others": k.other_remarks })
                
            li = LipidResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if li:
                row.update({ "LAB_LIPID_TCHO": li.total_cholesterol, "LAB_LIPID_TG": li.triglycerides, "LAB_LIPID_HDL": li.hdl, "LAB_LIPID_LDL": li.ldl, "LAB_LIPID_Remark": li.lp_remark, "LAB_LIPID_Others": li.other_remarks })
                
            lf = LFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if lf:
                row.update({ "LAB_LFT_AST": lf.ast, "LAB_LFT_ALT": lf.alt, "LAB_LFT_ALP": lf.alp, "LAB_LFT_TB": lf.tb, "LAB_LFT_CB": lf.cb, "LAB_LFT_Remark": lf.lft_remark, "LAB_LFT_Others": lf.other_remarks })
                
            s = SpecialTestsResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if s:
                row.update({ "SPECIAL_ECG": s.ecg_result, "SPECIAL_ECG_Remark": s.ecg_remark, "SPECIAL_Spirometry": s.spirometry_result, "SPECIAL_Spirometry_Remark": s.spirometry_remark, "SPECIAL_Audiometry": s.audiometry_result, "SPECIAL_Audiometry_Remark": s.audiometry_remark, "SPECIAL_Weight": s.weight, "SPECIAL_Height": s.height })
                
            dr = DirectorReview.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if dr:
                row.update({ "DIRECTOR_DM": dr.dm_status, "DIRECTOR_HTN": dr.htn_status, "DIRECTOR_BP": dr.bp, "DIRECTOR_Pulse": dr.pulse, "DIRECTOR_SPO2": dr.spo2, "DIRECTOR_HS": dr.hs_status, "DIRECTOR_LUTS": dr.luts, "DIRECTOR_Chronic_Cough": dr.chronic_cough, "DIRECTOR_Chest_Pain": dr.chronic_chest_pain, "DIRECTOR_Chest_Infection": dr.chest_infection, "DIRECTOR_Heart_Dx": dr.heart_dx, "DIRECTOR_Palor": dr.palor, "DIRECTOR_Jaundice": dr.jaundice, "DIRECTOR_Murmur": dr.murmur, "DIRECTOR_Chest_Status": dr.chest_status, "DIRECTOR_Breast": dr.breast_exam, "DIRECTOR_Breast_Remark": dr.breast_remark, "DIRECTOR_Abdomen": dr.abdomen, "DIRECTOR_PSA": dr.psa, "DIRECTOR_PSA_Remark": dr.psa_remark, "DIRECTOR_FBS": dr.fbs, "DIRECTOR_RBS": dr.rbs, "DIRECTOR_Sugar_Remark": dr.fbs_rbs_remark, "DIRECTOR_UA_Result": dr.ua_result, "DIRECTOR_UA_Remark": dr.ua_remark, "DIRECTOR_Assessment_HX_PE": dr.assessment_hx_pe, "DIRECTOR_Overall_Lab_Remark": dr.overall_lab_remark, "DIRECTOR_Other_Assessments": dr.other_assessments, "DIRECTOR_Other_Remarks": dr.other_remarks, "DIRECTOR_Comm1": dr.comment_one, "DIRECTOR_Comm2": dr.comment_two, "DIRECTOR_Comm3": dr.comment_three, "DIRECTOR_Comm4": dr.comment_four, "DIRECTOR_Final_Assessment": dr.overall_assessment, "DIRECTOR_Review_Date": dr.created_at.strftime('%Y-%m-%d %H:%M') if dr.created_at else '' })'''

new_code = r'''            # Complete Unified Schema Initialization (Clean Parameter Names)
            row = {
                "Staff ID": yp.staff_id, "Patient ID": yp.patient_id, "First Name": yp.first_name, "Last Name": yp.last_name, 
                "Year": yp.screening_year, "Section": context, "Registered Date": yp.created_at.strftime('%Y-%m-%d %H:%M') if yp.created_at else "",
                "Middle Name": "", "Gender": "", "Age": "", "DOB": "", "Phone": "", "Email": "", 
                "Department": "", "Race": "", "Nationality": "",
                "BP": "", "Pulse": "", "SPO2": "", "HS": "", "Palor": "", "Jaundice": "", 
                "Murmur": "", "Chest Status": "", "LUTS": "", "Chronic Cough": "", "Chest Pain": "", 
                "Chest Infection": "", "Heart Dx": "", "DM Status": "", "HTN Status": "", "PSA": "", 
                "PSA Remark": "", "FBS": "", "RBS": "", "Sugar Remark": "", "UA Result": "", 
                "UA Remark": "", "Breast Exam": "", "Breast Remark": "", "Abdomen": "", 
                "Assessment HX PE": "", "Overall Lab Remark": "", "Other Assessments": "", "Other Remarks": "", 
                "Overall Assessment": "", "Consulted By": "", "Consultation Date": "",
                "PCV": "", "WBC": "", "HGB": "", "PLT": "", "RBC": "", 
                "LYMP PCT": "", "LYMP ABS": "", "GRA PCT": "", "GRA ABS": "", 
                "MID PCT": "", "MID ABS": "", "MCV": "", "MCH": "", "MCHC": "", 
                "RDW": "", "PDW": "", "FBC Remark": "", "FBC Others": "",
                "Potassium": "", "Sodium": "", "Chloride": "", "Urea": "", 
                "Creatinine": "", "Bicarbonate": "", "HCO3": "", "KFT Remark": "", "KFT Others": "",
                "Total Cholesterol": "", "Triglycerides": "", "HDL": "", "LDL": "", "Lipid Remark": "", "Lipid Others": "",
                "AST": "", "ALT": "", "ALP": "", "TB": "", "CB": "", "LFT Remark": "", "LFT Others": "",
                "ECG": "", "ECG Remark": "", "Spirometry": "", "Spirometry Remark": "", 
                "Audiometry": "", "Audiometry Remark": "", "Weight": "", "Height": "",
                "Director Comm1": "", "Director Comm2": "", "Director Comm3": "", "Director Comm4": "", 
                "Final Assessment": "", "Director Review Date": ""
            }
            
            bio = BioData.query.filter_by(staff_id=yp.staff_id).first()
            if bio:
                row.update({ "Middle Name": getattr(bio, 'middle_name', ''), "Gender": getattr(bio, 'gender', ''), "Age": getattr(bio, 'age', ''), "DOB": getattr(bio, 'dob').strftime('%Y-%m-%d') if getattr(bio, 'dob', None) else '', "Phone": getattr(bio, 'phone', ''), "Email": getattr(bio, 'email', ''), "Department": getattr(bio, 'department', ''), "Race": getattr(bio, 'race', ''), "Nationality": getattr(bio, 'nationality', '') })
                
            c = ConsultationData.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if c:
                row.update({ "BP": c.bp, "Pulse": c.pulse, "SPO2": c.spo2, "HS": c.hs_status, "Palor": c.palor, "Jaundice": c.jaundice, "Murmur": c.murmur, "Chest Status": c.chest_status, "LUTS": c.luts, "Chronic Cough": c.chronic_cough, "Chest Pain": c.chronic_chest_pain, "Chest Infection": c.chest_infection, "Heart Dx": c.heart_dx, "DM Status": c.dm_status, "HTN Status": c.htn_status, "PSA": c.psa, "PSA Remark": c.psa_remark, "FBS": c.fbs, "RBS": c.rbs, "Sugar Remark": c.sugar_remark, "UA Result": c.ua_result, "UA Remark": c.ua_remark, "Breast Exam": c.breast_exam, "Breast Remark": c.breast_remark, "Abdomen": c.abdomen, "Assessment HX PE": c.assessment_hx_pe, "Overall Lab Remark": c.overall_lab_remark, "Other Assessments": c.other_assessments, "Other Remarks": c.other_remarks, "Overall Assessment": c.overall_assessment, "Consulted By": c.consulted_by_name, "Consultation Date": c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else '' })
                
            f = FBCResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if f:
                row.update({ "PCV": f.pcv, "WBC": f.wbc, "HGB": f.hgb, "PLT": f.plt, "RBC": f.rbc, "LYMP PCT": f.lymp_percent, "LYMP ABS": f.lymp_abs, "GRA PCT": f.gra_percent, "GRA ABS": f.gra_abs, "MID PCT": f.mid_percent, "MID ABS": f.mid_abs, "MCV": f.mcv, "MCH": f.mch, "MCHC": f.mchc, "RDW": f.rdw, "PDW": f.pdw, "FBC Remark": f.fbc_remark, "FBC Others": f.other_remarks })
                
            k = KFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if k:
                row.update({ "Potassium": k.potassium, "Sodium": k.sodium, "Chloride": k.chloride, "Urea": k.urea, "Creatinine": k.creatinine, "Bicarbonate": k.bicarbonate_ca, "HCO3": k.hco3, "KFT Remark": k.kft_remark, "KFT Others": k.other_remarks })
                
            li = LipidResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if li:
                row.update({ "Total Cholesterol": li.total_cholesterol, "Triglycerides": li.triglycerides, "HDL": li.hdl, "LDL": li.ldl, "Lipid Remark": li.lp_remark, "Lipid Others": li.other_remarks })
                
            lf = LFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if lf:
                row.update({ "AST": lf.ast, "ALT": lf.alt, "ALP": lf.alp, "TB": lf.tb, "CB": lf.cb, "LFT Remark": lf.lft_remark, "LFT Others": lf.other_remarks })
                
            s = SpecialTestsResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if s:
                row.update({ "ECG": s.ecg_result, "ECG Remark": s.ecg_remark, "Spirometry": s.spirometry_result, "Spirometry Remark": s.spirometry_remark, "Audiometry": s.audiometry_result, "Audiometry Remark": s.audiometry_remark, "Weight": s.weight, "Height": s.height })
                
            dr = DirectorReview.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if dr:
                overrides = {
                    "DM Status": dr.dm_status, "HTN Status": dr.htn_status, "BP": dr.bp, "Pulse": dr.pulse, 
                    "SPO2": dr.spo2, "HS": dr.hs_status, "LUTS": dr.luts, "Chronic Cough": dr.chronic_cough, 
                    "Chest Pain": dr.chronic_chest_pain, "Chest Infection": dr.chest_infection, 
                    "Heart Dx": dr.heart_dx, "Palor": dr.palor, "Jaundice": dr.jaundice, 
                    "Murmur": dr.murmur, "Chest Status": dr.chest_status, "Breast Exam": dr.breast_exam, 
                    "Breast Remark": dr.breast_remark, "Abdomen": dr.abdomen, "PSA": dr.psa, 
                    "PSA Remark": dr.psa_remark, "FBS": dr.fbs, "RBS": dr.rbs, 
                    "Sugar Remark": dr.fbs_rbs_remark, "UA Result": dr.ua_result, 
                    "UA Remark": dr.ua_remark, "Assessment HX PE": dr.assessment_hx_pe, 
                    "Overall Lab Remark": dr.overall_lab_remark, "Other Assessments": dr.other_assessments, 
                    "Other Remarks": dr.other_remarks
                }
                for k_key, v_val in overrides.items():
                    if v_val:
                        row[k_key] = v_val
                        
                row.update({ "Director Comm1": dr.comment_one, "Director Comm2": dr.comment_two, "Director Comm3": dr.comment_three, "Director Comm4": dr.comment_four, "Final Assessment": dr.overall_assessment, "Director Review Date": dr.created_at.strftime('%Y-%m-%d %H:%M') if dr.created_at else '' })'''

if old_code in lines:
    lines = lines.replace(old_code, new_code)
    with open(r'c:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare WebApp\App.LegitHealthCare\backend\routes\admin_bp.py', 'w', encoding='utf-8') as f:
        f.write(lines)
    print("SUCCESS")
else:
    print("FAILED: Did not match old code chunk precisely.")
