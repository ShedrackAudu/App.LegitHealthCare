from flask import Blueprint, request, jsonify
from models import db, ReportParameter, AuditLog
from decorators import require_permission
from flask_jwt_extended import jwt_required, get_jwt_identity

report_customization_bp = Blueprint('report_customization', __name__)

@report_customization_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission('manage_report_customization')
def get_report_parameters():
    try:
        params = ReportParameter.query.order_by(
            ReportParameter.category, 
            ReportParameter.display_order
        ).all()
        return jsonify([p.to_dict() for p in params]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@report_customization_bp.route('/', methods=['PUT'])
@jwt_required()
@require_permission('manage_report_customization')
def update_report_parameters():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"error": "Payload must be a list of parameter updates"}), 400
        
    try:
        updated_ids = []
        for item in data:
            param_id = item.get('id')
            if not param_id:
                continue
                
            param = ReportParameter.query.get(param_id)
            if not param:
                return jsonify({"error": f"Report parameter with ID '{param_id}' not found"}), 404
                
            if 'parameter_name' in item:
                param.parameter_name = item['parameter_name'].strip()
            if 'reference_value' in item:
                param.reference_value = item['reference_value'].strip()
            if 'unit' in item:
                param.unit = item['unit'].strip() if item['unit'] is not None else None
                
            updated_ids.append(param_id)
            
        db.session.commit()
        
        # Log to Audit Trail
        user_id = get_jwt_identity()
        AuditLog.log_action(
            action="Update Report Parameters",
            resource="ReportParameter",
            details={
                "message": f"Updated report parameters: {', '.join(updated_ids)}",
                "updated_count": len(updated_ids)
            }
        )
        
        return jsonify({"message": "Report parameters updated successfully", "count": len(updated_ids)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
