from flask import Blueprint, request, jsonify
from models import db, AISettings, BioData, ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, AuditLog
from openai import OpenAI
import openai
from decorators import require_permission
from utils.progress_utils import validate_tracked_parameters
import json
import traceback
import os

ai_bp = Blueprint('ai', __name__)

import re

def is_masked_key(key):
    if not key or not isinstance(key, str):
        return False
    k = key.strip()
    return '...' in k or '*' in k

def mask_api_key(key):
    if not key or not isinstance(key, str) or is_masked_key(key):
        return ""
    key = key.strip()
    if len(key) <= 8:
        return "********"
    return f"{key[:6]}...{key[-4:]}"

def get_effective_openai_api_key(provided_key=None):
    if provided_key and not is_masked_key(provided_key) and provided_key.strip():
        return provided_key.strip()
    env_key = os.getenv('OPENAI_API_KEY')
    if env_key and not is_masked_key(env_key) and env_key.strip():
        return env_key.strip()
    settings = AISettings.query.first()
    if settings and settings.api_key and not is_masked_key(settings.api_key) and settings.api_key.strip():
        return settings.api_key.strip()
    return None

def sanitize_ai_input(text):
    if not text or not isinstance(text, str):
        return text if text is not None else ""
    patterns = [
        r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|directions)",
        r"(?i)system\s+override",
        r"(?i)disregard\s+(all\s+)?(previous|prior|above)",
        r"(?i)you\s+are\s+now\s+a",
        r"(?i)new\s+system\s+prompt"
    ]
    sanitized = text
    for pattern in patterns:
        sanitized = re.sub(pattern, "[sanitized_directive]", sanitized)
    return sanitized

@ai_bp.route('/settings', methods=['GET'])
@require_permission('manage_ai')
def get_settings():
    settings = AISettings.query.first()
    if not settings:
        settings = AISettings()
        db.session.add(settings)
        db.session.commit()
    
    effective_key = get_effective_openai_api_key()
    return jsonify({
        'id': settings.id,
        'medical_parameters': json.loads(settings.medical_parameters) if settings.medical_parameters else [],
        'system_prompt': settings.system_prompt,
        'response_format': settings.response_format,
        'api_key': mask_api_key(effective_key or ""),
        'is_key_configured': bool(effective_key),
        'model_selection': settings.model_selection,
        'sample_comments': json.loads(settings.sample_comments) if settings.sample_comments else [],
        'prompt_fbc': settings.prompt_fbc,
        'prompt_lipid': settings.prompt_lipid,
        'prompt_lft': settings.prompt_lft,
        'prompt_kft': settings.prompt_kft
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
        settings.prompt_fbc = data.get('prompt_fbc', settings.prompt_fbc)
        settings.prompt_lipid = data.get('prompt_lipid', settings.prompt_lipid)
        settings.prompt_lft = data.get('prompt_lft', settings.prompt_lft)
        settings.prompt_kft = data.get('prompt_kft', settings.prompt_kft)
        
        new_api_key = data.get('api_key')
        if new_api_key and not is_masked_key(new_api_key) and new_api_key.strip():
            clean_key = new_api_key.strip()
            settings.api_key = clean_key
            # Persist to .env as per user request
            update_env_file('OPENAI_API_KEY', clean_key)
            # Update current env for immediate use if needed (though os.getenv might need reload)
            os.environ['OPENAI_API_KEY'] = clean_key
            
        settings.model_selection = data.get('model_selection', settings.model_selection)
        settings.sample_comments = json.dumps(data.get('sample_comments', []))
        
        db.session.commit()
        AuditLog.log_action("Update AI Settings", resource=f"AISettings:{settings.id}", details={"model_selection": settings.model_selection})
        return jsonify({"message": "AI settings updated successfully and persisted to .env"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@ai_bp.route('/test-connection', methods=['POST'])
@require_permission('manage_ai')
def test_connection():
    try:
        data = request.json or {}
        settings = AISettings.query.first()
        
        raw_key = data.get('api_key')
        api_key = get_effective_openai_api_key(raw_key)
        model_name = data.get('model_selection') or (settings.model_selection if settings else "gpt-4o-mini") or "gpt-4o-mini"
        
        if not api_key:
            return jsonify({"error": "No OpenAI API Key found. Please enter your API Key in the field above."}), 400
            
        base_url = os.getenv('OPENAI_BASE_URL') or None
        client = OpenAI(api_key=api_key, base_url=base_url, timeout=20.0, max_retries=2)
        
        params = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": "Respond with exactly 'Operational' to confirm API connection."}
            ]
        }
        if model_name.startswith("o1") or model_name.startswith("o3"):
            params["max_completion_tokens"] = 15
        else:
            params["max_tokens"] = 15
            
        response = client.chat.completions.create(**params)
        reply = response.choices[0].message.content.strip()
        
        return jsonify({
            "status": "success",
            "message": f"Connection verified successfully with {model_name}! (AI response: '{reply}')",
            "model": model_name
        }), 200
        
    except openai.AuthenticationError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Authentication Failure: The API Key is invalid or expired. Please check your OpenAI API key."}), 400
    except openai.RateLimitError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Quota Exceeded: Your account usage limit has been reached or has insufficient billing credits. Please check your billing on platform.openai.com."}), 402
    except openai.APIConnectionError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Error: Unable to reach OpenAI servers (api.openai.com). Please verify internet access, firewall, or DNS."}), 503
    except openai.APITimeoutError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Timeout: Request to OpenAI timed out. Please try again."}), 504
    except openai.NotFoundError as e:
        traceback.print_exc()
        return jsonify({"error": f"Model Not Found: '{model_name}' is not accessible on this API key. Try switching to 'gpt-4o-mini' or 'gpt-4o'."}), 404
    except openai.APIError as e:
        traceback.print_exc()
        return jsonify({"error": f"OpenAI API Error: {str(e)}"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"AI Connection Failed: {str(e)}"}), 500

@ai_bp.route('/generate', methods=['POST'])
@require_permission('director_review')
def generate_overview():
    try:
        data = request.json
        staff_id = data.get('staff_id')
        screening_year = data.get('screening_year')
        
        if not staff_id or not screening_year:
            return jsonify({"error": "Staff ID and Screening Year are required"}), 400
            
        settings = AISettings.query.first()
        api_key = get_effective_openai_api_key()
        
        if not api_key:
            return jsonify({"error": "OpenAI API Key is not configured in environment variables or AI Settings."}), 400
            
        base_url = os.getenv('OPENAI_BASE_URL') or None
        client = OpenAI(api_key=api_key.strip(), base_url=base_url, timeout=35.0, max_retries=2)
        
        # Validate that all 41 tracked progress parameters (including overall lab remark) are complete
        is_valid, missing, resolved = validate_tracked_parameters(staff_id, screening_year, mode='comments', overrides=data)
        if not is_valid:
            missing_str = ", ".join(missing)
            return jsonify({
                "error": f"Cannot generate comments: Patient data is incomplete. Missing tracked parameter(s): {missing_str}",
                "missing_parameters": missing
            }), 400

        # 1. Fetch Patient Data
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        
        if not patient:
            return jsonify({"error": "Patient data not found for given criteria."}), 404
            
        def getval(field_name):
            val = resolved.get(field_name)
            if isinstance(val, str):
                return sanitize_ai_input(val)
            return val

        # 2. Build AI Prompt Context
        context_parts = []
        context_parts.append(f"Patient Name: {patient.first_name} {patient.last_name}")
        context_parts.append(f"Age: {patient.age}, Gender: {patient.gender}")
        
        selected_params = json.loads(settings.medical_parameters) if settings.medical_parameters else []
        
        consultation_fields = {
            "Consultation:luts": ("LUTS", getval("luts")),
            "Consultation:chronic_cough": ("Chronic Cough", getval("chronic_cough")),
            "Consultation:chronic_chest_pain": ("Chronic Chest Pain", getval("chronic_chest_pain")),
            "Consultation:chest_infection": ("Chest Infection", getval("chest_infection")),
            "Consultation:heart_dx": ("Heart Disease History", getval("heart_dx")),
            "Consultation:palor": ("Palor", getval("palor")),
            "Consultation:jaundice": ("Jaundice", getval("jaundice")),
            "Consultation:murmur": ("Murmur", getval("murmur")),
            "Consultation:chest_status": ("Chest Status", getval("chest_status")),
            "Consultation:psa": ("PSA", f"{getval('psa')} (Remark: {getval('psa_remark')})"),
            "Consultation:sugar": ("Blood Sugar", f"FBS: {getval('fbs')}, RBS: {getval('rbs')} (Remark: {getval('sugar_remark')})"),
            "Consultation:urinalysis": ("Urinalysis Result", f"{getval('ua_result')} (Remark: {getval('ua_remark')})"),
            "Consultation:ua_remark_others": ("U/A Remark Others", getval("ua_remark_others")),
            "Consultation:dm_status": ("Diabetes Status", getval("dm_status")),
            "Consultation:htn_status": ("Hypertension Status", getval("htn_status")),
            "Consultation:bp": ("Blood Pressure", getval("bp")),
            "Consultation:pulse": ("Pulse Rate", getval("pulse")),
            "Consultation:spo2": ("SPO2", getval("spo2")),
            "Consultation:hs_status": ("Heart Sounds", getval("hs_status")),
            "Consultation:breast": ("Breast Exam", f"{getval('breast_exam')} (Remark: {getval('breast_remark')})"),
            "Consultation:breast_others": ("Breast Others", getval("breast_others")),
            "Consultation:abdomen": ("Abdomen", getval("abdomen")),
            "Consultation:abdomen_others": ("Abdomen Others", getval("abdomen_others")),
            "Consultation:hx_pe": ("H&P Assessment", getval("assessment_hx_pe")),
            "Consultation:other_assessments": ("Other Assessments", getval("other_assessments")),
            "Consultation:overall_lab": ("Overall Lab Remark", getval("overall_lab_remark")),
            "Consultation:overall_assessment": ("Overall Assessment", getval("overall_assessment")),
            "Consultation:other_remarks": ("General Remarks", getval("other_remarks"))
        }
        
        relevant_consultation = []
        for key, (label, val) in consultation_fields.items():
            if key in selected_params:
                relevant_consultation.append(f"{label}: {val or 'N/A'}")
        
        if relevant_consultation:
            context_parts.append("--- Consultation Data ---")
            context_parts.extend(relevant_consultation)
 
        if "FBC" in selected_params:
            fbc_rem = getval("fbc_remark")
            if fbc_rem:
                context_parts.append(f"--- FBC Results ---")
                context_parts.append(f"Remark: {fbc_rem or 'N/A'}")
 
        if "KFT" in selected_params:
            kft_rem = getval("kft_remark")
            if kft_rem:
                context_parts.append(f"--- KFT Results ---")
                context_parts.append(f"Remark: {kft_rem or 'N/A'}")
 
        if "LFT" in selected_params:
            lft_rem = getval("lft_remark")
            if lft_rem:
                context_parts.append(f"--- LFT Results ---")
                context_parts.append(f"Remark: {lft_rem or 'N/A'}")
 
        if "Lipid Profile" in selected_params:
            lp_rem = getval("lp_remark")
            if lp_rem:
                context_parts.append(f"--- Lipid Profile ---")
                context_parts.append(f"Remark: {lp_rem or 'N/A'}")
 
        if any(x in selected_params for x in ["ECG", "Spirometry", "Audiometry", "Weight", "Height"]):
            if any(getval(x) for x in ["ecg_result", "ecg_remark", "spirometry_result", "spirometry_remark", "audiometry_result", "audiometry_remark", "weight", "height"]):
                context_parts.append(f"--- Special Tests & Vitals ---")
                if "ECG" in selected_params:
                    context_parts.append(f"ECG: {getval('ecg_result')} (Remark: {getval('ecg_remark')})")
                if "Spirometry" in selected_params:
                    context_parts.append(f"Spiro: {getval('spirometry_result')} (Remark: {getval('spirometry_remark')})")
                if "Audiometry" in selected_params:
                    context_parts.append(f"Audio: {getval('audiometry_result')} (Remark: {getval('audiometry_remark')})")
                if "Weight" in selected_params and getval('weight'):
                    context_parts.append(f"Weight: {getval('weight')} kg")
                if "Height" in selected_params and getval('height'):
                    context_parts.append(f"Height: {getval('height')} m")
            
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
        model_name = settings.model_selection or "gpt-4o"
        params = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ]
        }
        if model_name.startswith("o1") or model_name.startswith("o3"):
            params["max_completion_tokens"] = 800
            if model_name not in ["o1-mini", "o1-preview"]:
                params["response_format"] = { "type": "json_object" }
        else:
            params["max_tokens"] = 800
            params["response_format"] = { "type": "json_object" }

        response = client.chat.completions.create(**params)
        
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
        return jsonify({"error": "OpenAI Authentication Failure: The configured API Key is invalid or has been revoked. Please update your API credentials in the AI Configuration menu."}), 400
    except openai.RateLimitError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Quota Exhausted: API usage limits have been exceeded. Please ensure your account has sufficient credits/billing allocation on platform.openai.com."}), 402
    except openai.APIConnectionError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Error: Unable to reach OpenAI servers (api.openai.com). Please verify your internet connection, firewall, or DNS settings."}), 503
    except openai.APITimeoutError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Timeout: Request to OpenAI timed out. Please try again."}), 504
    except openai.NotFoundError as e:
        traceback.print_exc()
        return jsonify({"error": f"Model Not Found: '{model_name}' is not accessible on this API key. Try switching to 'gpt-4o-mini' or 'gpt-4o'."}), 404
    except openai.APIError as e:
        traceback.print_exc()
        return jsonify({"error": f"OpenAI API Error: {str(e)}"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"AI Processing Error: {str(e)}"}), 500

@ai_bp.route('/generate-lab-remark', methods=['POST'])
@require_permission('director_review')
def generate_lab_remark():
    try:
        data = request.json
        staff_id = data.get('staff_id')
        screening_year = data.get('screening_year')
        
        if not staff_id or not screening_year:
            return jsonify({"error": "Staff ID and Screening Year are required"}), 400
            
        settings = AISettings.query.first()
        api_key = get_effective_openai_api_key()
        
        if not api_key:
            return jsonify({"error": "OpenAI API Key is not configured in environment variables or AI Settings."}), 400
            
        base_url = os.getenv('OPENAI_BASE_URL') or None
        client = OpenAI(api_key=api_key, base_url=base_url, timeout=35.0, max_retries=2)
        
        # Validate that all 40 tracked progress parameters (excluding comments and overall lab remark) are complete
        is_valid, missing, resolved = validate_tracked_parameters(staff_id, screening_year, mode='lab_remark', overrides=data)
        if not is_valid:
            missing_str = ", ".join(missing)
            return jsonify({
                "error": f"Cannot generate overall lab remark: Patient data is incomplete. Missing tracked parameter(s): {missing_str}",
                "missing_parameters": missing
            }), 400

        # Fetch Patient Data
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        
        def getval(field_name):
            val = resolved.get(field_name)
            if isinstance(val, str):
                return sanitize_ai_input(val)
            return val

        # Build Context
        context_parts = []
        if patient:
            context_parts.append(f"Patient Age: {patient.age or 'N/A'}, Gender: {patient.gender or 'N/A'}")
            
        fbc_rem = getval("fbc_remark")
        if fbc_rem:
            context_parts.append(f"FBC Remark: {fbc_rem or 'N/A'}")
            
        lft_rem = getval("lft_remark")
        if lft_rem:
            context_parts.append(f"LFT Remark: {lft_rem or 'N/A'}")
            
        kft_rem = getval("kft_remark")
        if kft_rem:
            context_parts.append(f"KFT Remark: {kft_rem or 'N/A'}")
            
        lp_rem = getval("lp_remark")
        if lp_rem:
            context_parts.append(f"Lipid Remark: {lp_rem or 'N/A'}")
            
        if any(getval(x) for x in ["fbs", "rbs", "sugar_remark", "ua_result", "ua_remark"]):
            context_parts.append(f"FBS/RBS: FBS={getval('fbs') or 'N/A'}, RBS={getval('rbs') or 'N/A'} (Remark: {getval('sugar_remark') or 'N/A'})")
            context_parts.append(f"Urinalysis: Result={getval('ua_result') or 'N/A'} (Remark: {getval('ua_remark') or 'N/A'})")
            
        full_context = "\n".join(context_parts)
        if not context_parts:
            return jsonify({"error": "No clinical data found to generate lab remark."}), 404
            
        system_content = (
            "You are a consultant medical pathologist analyzing a patient's laboratory test remarks and values "
            "to write a cohesive, comprehensive 'Overall Lab Remark'.\n"
            "Analyze the provided findings (FBC, LFT, KFT, Lipid, Glucose/Sugar, Urinalysis).\n"
            "Synthesize them into a single summary comment.\n"
            "CRITICAL: The remark MUST be extremely concise, direct, and MUST NOT exceed 150 characters (including spaces). "
            "Write ONLY the plain text remark. Do NOT wrap in quotes, brackets, or add conversational intros/outros."
        )
        
        model_name = settings.model_selection or "gpt-4o"
        params = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"Lab Findings:\n{full_context}"}
            ]
        }
        if model_name.startswith("o1") or model_name.startswith("o3"):
            params["max_completion_tokens"] = 100
        else:
            params["max_tokens"] = 100

        response = client.chat.completions.create(**params)
        
        remark = response.choices[0].message.content.strip()
        if (remark.startswith('"') and remark.endswith('"')) or (remark.startswith("'") and remark.endswith("'")):
            remark = remark[1:-1].strip()
        if len(remark) > 150:
            remark = remark[:147] + "..."
            
        return jsonify({
            "message": "Overall Lab Remark generated successfully",
            "overall_lab_remark": remark
        }), 200
        
    except openai.AuthenticationError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Authentication Failure: The configured API Key is invalid, inactive, or has been revoked."}), 400
    except openai.RateLimitError as e:
        traceback.print_exc()
        return jsonify({"error": "OpenAI Quota Exhausted: API usage limits exceeded. Please check your billing on platform.openai.com."}), 402
    except openai.APIConnectionError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Error: Unable to reach OpenAI servers (api.openai.com). Please verify internet access, firewall, or DNS settings."}), 503
    except openai.APITimeoutError as e:
        traceback.print_exc()
        return jsonify({"error": "Connection Timeout: Request to OpenAI timed out. Please try again."}), 504
    except openai.NotFoundError as e:
        traceback.print_exc()
        return jsonify({"error": f"Model Not Found: '{model_name}' is not accessible on this API key. Try switching to 'gpt-4o-mini' or 'gpt-4o'."}), 404
    except openai.APIError as e:
        traceback.print_exc()
        return jsonify({"error": f"OpenAI API Error: {str(e)}"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"AI Processing Error: {str(e)}"}), 500
