from flask import Blueprint, request, jsonify
from models import db, Race, Nationality, Department
from auth_utils import login_required, role_required

config_bp = Blueprint('config', __name__)

# Race CRUD
@config_bp.route('/races', methods=['GET'])
def get_races():
    races = Race.query.order_by(Race.name.asc()).all()
    return jsonify([{"id": r.id, "name": r.name} for r in races]), 200

@config_bp.route('/races', methods=['POST'])
@login_required
@role_required('Admin')
def add_race():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"error": "Name is required"}), 400
    
    if Race.query.filter_by(name=data['name']).first():
        return jsonify({"error": "Race already exists"}), 400
        
    new_race = Race(name=data['name'])
    db.session.add(new_race)
    db.session.commit()
    return jsonify({"id": new_race.id, "name": new_race.name}), 201

@config_bp.route('/races/<int:id>', methods=['DELETE'])
@login_required
@role_required('Admin')
def delete_race(id):
    race = Race.query.get(id)
    if not race:
        return jsonify({"error": "Race not found"}), 404
    db.session.delete(race)
    db.session.commit()
    return jsonify({"message": "Race deleted"}), 200

# Nationality CRUD
@config_bp.route('/nationalities', methods=['GET'])
def get_nationalities():
    nationalities = Nationality.query.order_by(Nationality.name.asc()).all()
    return jsonify([{"id": n.id, "name": n.name} for n in nationalities]), 200

@config_bp.route('/nationalities', methods=['POST'])
@login_required
@role_required('Admin')
def add_nationality():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"error": "Name is required"}), 400
    
    if Nationality.query.filter_by(name=data['name']).first():
        return jsonify({"error": "Nationality already exists"}), 400
        
    new_nat = Nationality(name=data['name'])
    db.session.add(new_nat)
    db.session.commit()
    return jsonify({"id": new_nat.id, "name": new_nat.name}), 201

@config_bp.route('/nationalities/<int:id>', methods=['DELETE'])
@login_required
@role_required('Admin')
def delete_nationality(id):
    nat = Nationality.query.get(id)
    if not nat:
        return jsonify({"error": "Nationality not found"}), 404
    db.session.delete(nat)
    db.session.commit()
    return jsonify({"message": "Nationality deleted"}), 200

# Department CRUD (Existing logic moved or duplicated for consistency in System Config)
@config_bp.route('/departments', methods=['GET'])
def get_departments():
    depts = Department.query.order_by(Department.name.asc()).all()
    return jsonify([{"id": d.id, "name": d.name} for d in depts]), 200

@config_bp.route('/departments', methods=['POST'])
@login_required
@role_required('Admin')
def add_department():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({"error": "Department name is required"}), 400
    
    if Department.query.filter_by(name=data['name']).first():
        return jsonify({"error": "Department already exists"}), 400
        
    new_dept = Department(name=data['name'])
    db.session.add(new_dept)
    db.session.commit()
    return jsonify({"id": new_dept.id, "name": new_dept.name}), 201

@config_bp.route('/departments/<int:id>', methods=['DELETE'])
@login_required
@role_required('Admin')
def delete_department(id):
    dept = Department.query.get(id)
    if not dept:
        return jsonify({"error": "Department not found"}), 404
    db.session.delete(dept)
    db.session.commit()
    return jsonify({"message": "Department deleted"}), 200
