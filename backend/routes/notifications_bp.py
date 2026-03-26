from flask import Blueprint, request, jsonify
from models import db, Notification

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
def get_notifications():
    user_id = request.headers.get('X-User-ID')
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
def mark_read(notif_id):
    user_id = request.headers.get('X-User-ID')
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not notif:
        return jsonify({"error": "Not found"}), 404
        
    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked read", "notification": notif.to_dict()})

@notifications_bp.route('/read-all', methods=['PUT'])
def mark_all_read():
    user_id = request.headers.get('X-User-ID')
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All marked read"})
