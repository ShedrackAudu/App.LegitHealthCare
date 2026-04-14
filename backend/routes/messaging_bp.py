from flask import Blueprint, request, jsonify
from models import db, User, ChatMessage, ChatGroup, ChatGroupMember
from datetime import datetime, timedelta
from decorators import require_permission
import json
from socket_handlers import connected_users

messaging_bp = Blueprint('messaging', __name__)

@messaging_bp.route('/conversations', methods=['GET'])
@require_permission('messaging')
def get_conversations():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = int(user_id)
    
    # 1. Get Direct Chats (where user is sender or receiver)
    # This is a bit complex in SQL to get "latest message per user pair"
    # For now, we'll get last 50 unique people messaged
    direct_msgs = ChatMessage.query.filter(
        ((ChatMessage.sender_id == user_id) | (ChatMessage.receiver_id == user_id)) &
        (ChatMessage.group_id == None)
    ).order_by(ChatMessage.created_at.desc()).all()
    
    seen_users = set()
    conversations = []
    
    for msg in direct_msgs:
        other_id = msg.receiver_id if msg.sender_id == user_id else msg.sender_id
        if other_id not in seen_users:
            other_user = User.query.get(other_id)
            if other_user:
                other_dict = other_user.to_dict()
                threshold = datetime.now() - timedelta(minutes=2)
                other_dict['is_online'] = other_user.last_seen_at > threshold if other_user.last_seen_at else False
                other_dict.pop('department', None)
                other_dict.pop('section', None)
                conversations.append({
                    "id": f"dm_{other_id}",
                    "type": "direct",
                    "other_user": other_dict,
                    "last_message": msg.to_dict(),
                    "unread_count": ChatMessage.query.filter_by(
                        sender_id=other_id, receiver_id=user_id, read_at=None
                    ).count()
                })
                seen_users.add(other_id)

    # 2. Get Groups
    memberships = ChatGroupMember.query.filter_by(user_id=user_id).all()
    for m in memberships:
        group = ChatGroup.query.get(m.group_id)
        if group:
            last_msg = ChatMessage.query.filter_by(group_id=group.id).order_by(ChatMessage.created_at.desc()).first()
            conversations.append({
                "id": f"group_{group.id}",
                "type": "group",
                "group": group.to_dict(),
                "last_message": last_msg.to_dict() if last_msg else None,
                "unread_count": ChatMessage.query.filter(
                    ChatMessage.group_id == group.id,
                    ChatMessage.sender_id != user_id,
                    ChatMessage.created_at > m.last_read_at
                ).count()
            })
            
    return jsonify(conversations)

@messaging_bp.route('/history/<conv_id>', methods=['GET'])
@require_permission('messaging')
def get_history(conv_id):
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    if conv_id.startswith('dm_'):
        other_id = int(conv_id.split('_')[1])
        messages = ChatMessage.query.filter(
            ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == other_id)) |
            ((ChatMessage.sender_id == other_id) & (ChatMessage.receiver_id == user_id))
        ).order_by(ChatMessage.created_at.desc()).paginate(page=page, per_page=per_page)
    else:
        group_id = int(conv_id.split('_')[1])
        messages = ChatMessage.query.filter_by(group_id=group_id).order_by(ChatMessage.created_at.desc()).paginate(page=page, per_page=per_page)
        
    return jsonify({
        "messages": [m.to_dict() for m in reversed(messages.items)],
        "has_more": messages.has_next
    })

@messaging_bp.route('/search-users', methods=['GET'])
@require_permission('messaging')
def search_users():
    query = request.args.get('q', '')
    user_id = request.headers.get('X-User-ID')
    if user_id:
        user_id = int(user_id)
        
    if query:
        users = User.query.filter(
            (User.id != user_id) & (
                (User.first_name.ilike(f'%{query}%')) | 
                (User.last_name.ilike(f'%{query}%')) |
                (User.username.ilike(f'%{query}%'))
            )
        ).limit(20).all()
    else:
        # Default: list first 20 other users
        users = User.query.filter(User.id != user_id).limit(20).all()
    
    def user_with_status(u):
        d = u.to_dict()
        # Presence logic: Check if user was seen in the last 2 minutes
        threshold = datetime.now() - timedelta(minutes=2)
        d['is_online'] = u.last_seen_at > threshold if u.last_seen_at else False
        
        # Security/Privacy: Remove sensitive corporate fields as requested
        d.pop('department', None)
        d.pop('section', None)
        return d

    return jsonify([user_with_status(u) for u in users])

@messaging_bp.route('/groups', methods=['POST'])
@require_permission('messaging')
def create_group():
    user_id = request.headers.get('X-User-ID')
    data = request.json
    name = data.get('name')
    member_ids = data.get('members', [])
    
    if not name:
        return jsonify({"error": "Group name is required"}), 400
        
    group = ChatGroup(name=name, created_by=user_id)
    db.session.add(group)
    db.session.flush()
    
    # Add creator as Admin
    creator = ChatGroupMember(group_id=group.id, user_id=user_id, role='Admin')
    db.session.add(creator)
    
    # Add other members
    for mid in member_ids:
        if mid != user_id:
            member = ChatGroupMember(group_id=group.id, user_id=mid, role='Member')
            db.session.add(member)
            
    db.session.commit()
    return jsonify(group.to_dict()), 201

@messaging_bp.route('/conversations/<conv_id>', methods=['DELETE'])
@require_permission('messaging')
def delete_conversation(conv_id):
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = int(user_id)
    
    if conv_id.startswith('dm_'):
        other_id = int(conv_id.split('_')[1])
        # Permanently delete all messages between these two users
        ChatMessage.query.filter(
            ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == other_id)) |
            ((ChatMessage.sender_id == other_id) & (ChatMessage.receiver_id == user_id))
        ).delete(synchronize_session=False)
    else:
        group_id = int(conv_id.split('_')[1])
        # Check if user is Admin of the group
        member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
        if not member or member.role != 'Admin':
            return jsonify({"error": "Only group admins can clear chat history"}), 403
        
        # Permanently delete all messages in the group
        ChatMessage.query.filter_by(group_id=group_id).delete(synchronize_session=False)
    
    db.session.commit()
    return jsonify({"message": "Conversation history and session deleted successfully"})

@messaging_bp.route('/heartbeat', methods=['POST'])
@require_permission('messaging')
def heartbeat():
    user_id = request.headers.get('X-User-ID')
    if user_id:
        user = User.query.get(int(user_id))
        if user:
            user.last_seen_at = datetime.now()
            db.session.commit()
    return jsonify({"status": "alive"}), 200
