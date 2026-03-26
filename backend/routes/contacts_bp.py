from flask import Blueprint, request, jsonify
from models import db, User, UserContact

contacts_bp = Blueprint('contacts', __name__)

@contacts_bp.route('/api/account/contacts', methods=['GET'])
def get_contacts():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    contacts = UserContact.query.filter_by(user_id=user_id).all()
    return jsonify([c.to_dict() for c in contacts])

@contacts_bp.route('/api/account/contacts/save', methods=['POST'])
def save_contact():
    user_id = request.headers.get('X-User-ID')
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
    
    return jsonify(contact.to_dict()), 201

@contacts_bp.route('/api/account/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    user_id = request.headers.get('X-User-ID')
    contact = UserContact.query.get(contact_id)
    
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    if str(contact.user_id) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(contact)
    db.session.commit()
    return jsonify({"success": True})
