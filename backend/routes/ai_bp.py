from flask import Blueprint, request, jsonify
from models import db, AISettings, BioData, ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, AuditLog
from openai import OpenAI
import openai
from decorators import require_permission
import json
import traceback
import os

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/settings', methods=['GET'])
@require_permission('manage_ai')
def get_settings():
    settings = AISettings.query.first()
    if not settings:
        settings = AISettings()
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        'id': settings.id,
        'medical_parameters': json.loads(settings.medical_parameters) if settings.medical_parameters else [],
        'system_prompt': settings.system_prompt,
        'response_format': settings.response_format,
        'api_key': settings.api_key or "",
        'model_selection': settings.model_selection,
        'sample_comments': json.loads(settings.sample_comments) if settings.sample_comments else []
    }), 200

def update_env_file(key, value):
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_path):
        with open(env_path, 'w') as f:
            f.write(f"{key}='{value}'\n")
        return

    with open(env_path, 'r') as f:
        lines = f.readlines()

    key_found = False
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}='{value}'\n")
            key_found = True
        else:
            new_lines.append(line)

    if not key_found:
        new_lines.append(f"{key}='{value}'\n")

    with open(env_path, 'w') as f:
        f.writelines(new_lines)

@ai_bp.route('/settings', methods=['POST'])
@require_permission('manage_ai')
def update_settings():
    try:
        data = request.json
        settings = AISettings.query.first()
        if not settings:
            settings = AISettings()
            db.session.add(settings)
            
        settings.medical_parameters = json.dumps(data.get('medical_parameters', []))
        settings.system_prompt = data.get('system_prompt', settings.system_prompt)
        settings.response_format = data.get('response_format', settings.response_format)
        
        new_api_key = data.get('api_key')
        if new_api_key:
            settings.api_key = new_api_key
            # Persist to .env as per user request
            update_env_file('OPENAI_API_KEY', new_api_key)
            # Update current env for immediate use if needed (though os.getenv might need reload)
            os.environ['OPENAI_API_KEY'] = new_api_key
            
        settings.model_selection = data.get('model_selection', settings.model_selection)
        settings.sample_comments = json.dumps(data.get('sample_comments', []))
        
        db.session.commit()
        AuditLog.log_action("Update AI Settings", resource=f"AISettings:{settings.id}", details={"model_selection": settings.model_selection})
        return jsonify({"message": "AI settings updated successfully and persisted to .env"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@ai_bp.route('/generate', methods=['POST'])
@require_permission('manage_ai')
def generate_overview():
    try:
        data = request.json
        staff_id = data.get('staff_id')
        screening_year = data.get('screening_year')
        
        if not staff_id or not screening_year:
            return jsonify({"error": "Staff ID and Screening Year are required"}), 400
            
        settings = AISettings.query.first()
        # Prioritize key from environment variable as per user request
        api_key = os.getenv('OPENAI_API_KEY') or (settings.api_key if settings else None)
        
        if not api_key:
            return jsonify({"error": "OpenAI API Key is not configured in environment variables or AI Settings."}), 400
            
        client = OpenAI(api_key=api_key)
        
        # 1. Fetch Patient Data
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        consultation = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
        
        if not patient or not consultation:
            return jsonify({"error": "Patient or Consultation data not found for given criteria."}), 404
            
        # 2. Build AI Prompt Context
        context_parts = []
        context_parts.append(f"Patient Name: {patient.first_name} {patient.last_name}")
        context_parts.append(f"Age: {patient.age}, Gender: {patient.gender}")
        
        selected_params = json.loads(settings.medical_parameters) if settings.medical_parameters else []
        
        consultation_fields = {
            "Consultation:luts": ("LUTS", consultation.luts),
            "Consultation:chronic_cough": ("Chronic Cough", consultation.chronic_cough),
            "Consultation:chronic_chest_pain": ("Chronic Chest Pain", consultation.chronic_chest_pain),
            "Consultation:chest_infection": ("Chest Infection", consultation.chest_infection),
            "Consultation:heart_dx": ("Heart Disease History", consultation.heart_dx),
            "Consultation:palor": ("Palor", consultation.palor),
            "Consultation:jaundice": ("Jaundice", consultation.jaundice),
            "Consultation:murmur": ("Murmur", consultation.murmur),
            "Consultation:chest_status": ("Chest Status", consultation.chest_status),
            "Consultation:psa": ("PSA", f"{consultation.psa} (Remark: {consultation.psa_remark})"),
            "Consultation:sugar": ("Blood Sugar", f"FBS: {consultation.fbs}, RBS: {consultation.rbs} (Remark: {consultation.sugar_remark})"),
            "Consultation:urinalysis": ("Urinalysis Result", f"{consultation.ua_result} (Remark: {consultation.ua_remark})"),
            "Consultation:ua_remark_others": ("U/A Remark Others", consultation.ua_remark_others),
            "Consultation:dm_status": ("Diabetes Status", consultation.dm_status),
            "Consultation:htn_status": ("Hypertension Status", consultation.htn_status),
            "Consultation:bp": ("Blood Pressure", consultation.bp),
            "Consultation:pulse": ("Pulse Rate", consultation.pulse),
            "Consultation:spo2": ("SPO2", consultation.spo2),
            "Consultation:hs_status": ("Heart Sounds", consultation.hs_status),
            "Consultation:breast": ("Breast Exam", f"{consultation.breast_exam} (Remark: {consultation.breast_remark})"),
            "Consultation:breast_others": ("Breast Others", consultation.breast_others),
            "Consultation:abdomen": ("Abdomen", consultation.abdomen),
            "Consultation:abdomen_others": ("Abdomen Others", consultation.abdomen_others),
            "Consultation:hx_pe": ("H&P Assessment", consultation.assessment_hx_pe),
            "Consultation:other_assessments": ("Other Assessments", consultation.other_assessments),
            "Consultation:overall_lab": ("Overall Lab Remark", consultation.overall_lab_remark),
            "Consultation:overall_assessment": ("Overall Assessment", consultation.overall_assessment),
            "Consultation:other_remarks": ("General Remarks", consultation.other_remarks)
        }
        
        relevant_consultation = []
        for key, (label, val) in consultation_fields.items():
            if key in selected_params:
                relevant_consultation.append(f"{label}: {val or 'N/A'}")
        
        if relevant_consultation:
            context_parts.append("--- Consultation Data ---")
            context_parts.extend(relevant_consultation)

        if "FBC" in selected_params:
            fbc = FBCResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
            if fbc:
                context_parts.append(f"--- FBC Results ---")
                context_parts.append(f"PCV: {fbc.pcv}, WBC: {fbc.wbc}, PLT: {fbc.plt}, HGB: {fbc.hgb}, RBC: {fbc.rbc}")
                context_parts.append(f"Remark: {fbc.fbc_remark}")

        if "KFT" in selected_params:
            kft = KFTResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
            if kft:
                context_parts.append(f"--- KFT Results ---")
                context_parts.append(f"Potassium: {kft.potassium}, Sodium: {kft.sodium}")
                context_parts.append(f"Remark: {kft.kft_remark}")

        if "LFT" in selected_params:
            lft = LFTResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
            if lft:
                context_parts.append(f"--- LFT Results ---")
                context_parts.append(f"AST: {lft.ast}, ALT: {lft.alt}, ALP: {lft.alp}, TB: {lft.tb}, CB: {lft.cb}, Urea: {lft.urea}, Creatinine: {lft.creatinine}")
                context_parts.append(f"Remark: {lft.lft_remark}")

        if "Lipid Profile" in selected_params:
            lp = LipidResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
            if lp:
                context_parts.append(f"--- Lipid Profile Results ---")
                context_parts.append(f"Total Chol: {lp.total_cholesterol}, Triglycerides: {lp.triglycerides}, HDL: {lp.hdl}, LDL: {lp.ldl}")
                context_parts.append(f"Remark: {lp.lp_remark}")

        if any(x in selected_params for x in ["ECG", "Spirometry", "Audiometry", "Weight", "Height"]):
            spec = SpecialTestsResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
            if spec:
                context_parts.append(f"--- Special Tests & Vitals ---")
                if "ECG" in selected_params:
                    context_parts.append(f"ECG: {spec.ecg_result} (Remark: {spec.ecg_remark})")
                if "Spirometry" in selected_params:
                    context_parts.append(f"Spiro: {spec.spirometry_result} (Remark: {spec.spirometry_remark})")
                if "Audiometry" in selected_params:
                    context_parts.append(f"Audio: {spec.audiometry_result} (Remark: {spec.audiometry_remark})")
                if "Weight" in selected_params:
                    context_parts.append(f"Weight: {spec.weight} kg")
                if "Height" in selected_params:
                    context_parts.append(f"Height: {spec.height} m")
            
        # (Other tests like FBC, LFT, ECG would be fetched here if requested and available)
        
        full_context = "\n".join(context_parts)
        
        format_instructions = ""
        if settings.response_format == "Bullet Points":
            format_instructions = "Please format your response strictly as a bulleted list using markdown."
        elif settings.response_format == "Paragraph":
            format_instructions = "Please format your response as a single, cohesive paragraph."
        elif settings.response_format == "Short Summary":
            format_instructions = "Please provide a very short, two-sentence summary."
            
        system_content = f"{settings.system_prompt}\n\nIMPORTANT: You MUST provide exactly 4 distinct medical comments/observations based on the data. Format your response as a JSON array of 4 strings. No other text."
        
        sample_comments = json.loads(settings.sample_comments) if settings.sample_comments else []
        if sample_comments:
            samples_str = "\n".join([f"- {s}" for s in sample_comments])
            system_content += f"\n\nHere are some sample comments for style guidance:\n{samples_str}"
            
        user_content = f"Patient Data:\n{full_context}"
        
        # 3. Call OpenAI API
        response = client.chat.completions.create(
            model=settings.model_selection or "gpt-4o",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            response_format={ "type": "json_object" },
            max_tokens=800
        )
        
        raw_content = response.choices[0].message.content
        try:
            parsed = json.loads(raw_content)
            # Support both {"comments": [...]} or just a list if possible, 
            # but usually OpenAI JSON mode prefers an object.
            comments = parsed.get("comments", [])
            if not comments and isinstance(parsed, list):
                comments = parsed
            
            # Fallback if not enough comments
            while len(comments) < 4:
                comments.append("")
        except:
            # Fallback if JSON parsing fails
            comments = [raw_content, "", "", ""]
        
        return jsonify({
            "message": "Overview generated successfully",
            "overview": raw_content, # Keeping raw for debug
            "comments": comments[:4]
        }), 200
        
    except openai.AuthenticationError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Authentication Failure: The configured API Key is invalid, inactive, or has been revoked on the OpenAI Platform. Please update your API credentials in the AI Configuration menu."}), 401
    except openai.RateLimitError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Quota Exhausted: API usage limits have been exceeded. Please ensure your account has sufficient credits/billing allocation and that a valid API key is currently provisioned."}), 402
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
