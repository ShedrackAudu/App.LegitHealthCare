from flask import Blueprint, request, jsonify
from models import db, Department
from decorators import require_permission

departments_bp = Blueprint('departments_bp', __name__)

@departments_bp.route('/', methods=['GET'])
@require_permission('manage_departments')
def get_departments():
    # Context injected implicitly via RoutingSession
    departments = Department.query.order_by(Department.name).all()
    # Provide default if empty
    if not departments:
        default_names = ['Admin', 'Mechanical', 'Power Plant', 'Packing Plant', 'Security']
        for name in default_names:
            dep = Department(name=name)
            db.session.add(dep)
        db.session.commit()
        departments = Department.query.order_by(Department.name).all()

    return jsonify([{"id": d.id, "name": d.name} for d in departments]), 200

@departments_bp.route('/', methods=['POST'])
@require_permission('manage_departments')
def add_department():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Department name is required"}), 400
        
    existing = Department.query.filter(Department.name.ilike(name)).first()
    if existing:
        return jsonify({"error": "Department already exists"}), 400
        
    dep = Department(name=name)
    db.session.add(dep)
    db.session.commit()
    return jsonify({"message": "Department added successfully", "id": dep.id, "name": dep.name}), 201

@departments_bp.route('/<int:dep_id>', methods=['DELETE'])
@require_permission('manage_departments')
def delete_department(dep_id):
    dep = Department.query.get(dep_id)
    if not dep:
        return jsonify({"error": "Department not found"}), 404
        
    db.session.delete(dep)
    db.session.commit()
    return jsonify({"message": "Department deleted successfully"}), 200
