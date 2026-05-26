from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Notification, AuditLog

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
        
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        
    return jsonify({
        "notifications": [n.to_dict() for n in notifications.items],
        "total": notifications.total,
        "unread_count": unread_count
    })

@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not notif:
        return jsonify({"error": "Not found"}), 404
        
    notif.is_read = True
    db.session.commit()
    AuditLog.log_action("Mark Notification Read", resource=f"Notification:{notif_id}", details={"notif_id": notif_id})
    return jsonify({"message": "Marked read", "notification": notif.to_dict()})

@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    AuditLog.log_action("Mark All Notifications Read", resource="Notification", details={})
    return jsonify({"message": "All marked read"})
@notifications_bp.route('/delete-all', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Auth ID required"}), 401
        
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    AuditLog.log_action("Delete All Notifications", resource="Notification", details={})
    
    return jsonify({"message": "All notifications permanently deleted"})
