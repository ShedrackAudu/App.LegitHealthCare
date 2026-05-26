from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserContact, AuditLog

contacts_bp = Blueprint('contacts', __name__)

@contacts_bp.route('/api/account/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    contacts = UserContact.query.filter_by(user_id=user_id).all()
    return jsonify([c.to_dict() for c in contacts])

@contacts_bp.route('/api/account/contacts/save', methods=['POST'])
@jwt_required()
def save_contact():
    user_id = get_jwt_identity()
    data = request.json
    if not user_id or not data:
        return jsonify({"error": "Invalid request"}), 400
    
    label = data.get('label')
    value = data.get('value')
    contact_type = data.get('contact_type', 'text')
    
    if not label or not value:
        return jsonify({"error": "Label and value are required"}), 400
    
    contact = UserContact(user_id=user_id, label=label, value=value, contact_type=contact_type)
    db.session.add(contact)
    db.session.commit()
    AuditLog.log_action("Save Emergency Contact", resource=f"UserContact:{contact.id}", details={"label": label})
    
    return jsonify(contact.to_dict()), 201

@contacts_bp.route('/api/account/contacts/<int:contact_id>', methods=['DELETE'])
@jwt_required()
def delete_contact(contact_id):
    user_id = get_jwt_identity()
    contact = UserContact.query.get(contact_id)
    
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    if str(contact.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(contact)
    db.session.commit()
    AuditLog.log_action("Delete Emergency Contact", resource=f"UserContact:{contact_id}", details={"label": contact.label})
    return jsonify({"success": True})
