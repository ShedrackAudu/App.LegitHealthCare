from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ChatMessage, ChatGroup, ChatGroupMember
from datetime import datetime, timedelta
from decorators import require_permission
import json
from socket_handlers import connected_users

messaging_bp = Blueprint('messaging', __name__)

@messaging_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()
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
@jwt_required()
def get_history(conv_id):
    user_id = get_jwt_identity()
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
@jwt_required()
def search_users():
    query = request.args.get('q', '')
    user_id = get_jwt_identity()
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
        # Default: list first 100 other users for easier picking
        users = User.query.filter(User.id != user_id).limit(100).all()
    
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
@jwt_required()
def create_group():
    user_id = get_jwt_identity()
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
@jwt_required()
def delete_conversation(conv_id):
    user_id = get_jwt_identity()
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
    elif conv_id.startswith('group_'):
        group_id = int(conv_id.split('_')[1])
        # Permanently delete all messages in this group
        ChatMessage.query.filter_by(group_id=group_id).delete(synchronize_session=False)
        
    db.session.commit()
    return jsonify({"message": "Conversation history cleared successfully"})

@messaging_bp.route('/groups/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = int(user_id)
    
    # Check if user is Admin of the group
    member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not member or member.role != 'Admin':
        return jsonify({"error": "Only group admins can delete the entire group"}), 403
    
    # 1. Delete all messages
    ChatMessage.query.filter_by(group_id=group_id).delete(synchronize_session=False)
    
    # 2. Delete all members
    ChatGroupMember.query.filter_by(group_id=group_id).delete(synchronize_session=False)
    
    # 3. Delete the group itself
    group = ChatGroup.query.get(group_id)
    if group:
        db.session.delete(group)
        
    db.session.commit()
    return jsonify({"message": "Group chat permanently deleted"})

@messaging_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def heartbeat():
    user_id = get_jwt_identity()
    if user_id:
        user = User.query.get(int(user_id))
        if user:
            user.last_seen_at = datetime.now()
            db.session.commit()
    return jsonify({"status": "alive"}), 200

# --- Group Management Features ---

@messaging_bp.route('/groups/<int:group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    memberships = ChatGroupMember.query.filter_by(group_id=group_id).all()
    members_list = []
    for m in memberships:
        user = User.query.get(m.user_id)
        if user:
            u_dict = user.to_dict()
            u_dict['role'] = m.role
            members_list.append(u_dict)
    return jsonify(members_list), 200

@messaging_bp.route('/groups/<int:group_id>/members', methods=['POST'])
@jwt_required()
def add_group_members(group_id):
    current_user_id = int(get_jwt_identity())
    data = request.json
    new_member_ids = data.get('members', [])
    
    # Check if current user is an admin of the group
    admin_check = ChatGroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='Admin').first()
    if not admin_check:
        return jsonify({"error": "Only group admins can add new members"}), 403
        
    added_count = 0
    for mid in new_member_ids:
        # Check if already a member
        exists = ChatGroupMember.query.filter_by(group_id=group_id, user_id=mid).first()
        if not exists:
            new_member = ChatGroupMember(group_id=group_id, user_id=mid, role='Member')
            db.session.add(new_member)
            added_count += 1
            
    db.session.commit()
    return jsonify({"message": f"Added {added_count} members to the group"}), 200

@messaging_bp.route('/groups/<int:group_id>/members/<int:remove_user_id>', methods=['DELETE'])
@jwt_required()
def remove_group_member(group_id, remove_user_id):
    current_user_id = int(get_jwt_identity())
    
    # Check if current user is admin OR removing themselves
    admin_check = ChatGroupMember.query.filter_by(group_id=group_id, user_id=current_user_id, role='Admin').first()
    
    if not admin_check and current_user_id != remove_user_id:
        return jsonify({"error": "Unauthorized to remove this member"}), 403
        
    # Prevent removing the last admin
    if admin_check and current_user_id == remove_user_id:
        admin_count = ChatGroupMember.query.filter_by(group_id=group_id, role='Admin').count()
        if admin_count <= 1:
            return jsonify({"error": "Cannot leave group without assigning another Admin"}), 400
            
    membership = ChatGroupMember.query.filter_by(group_id=group_id, user_id=remove_user_id).first()
    if membership:
        db.session.delete(membership)
        db.session.commit()
        return jsonify({"message": "Member removed successfully"}), 200
        
    return jsonify({"error": "Member not found"}), 404

# --- Message Management Features ---

@messaging_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_single_message(message_id):
    current_user_id = int(get_jwt_identity())
    message = ChatMessage.query.get(message_id)
    
    if not message:
        return jsonify({"error": "Message not found"}), 404
        
    # Only the sender or a group admin (if group msg) can delete
    is_sender = message.sender_id == current_user_id
    is_group_admin = False
    
    if message.group_id:
        admin_check = ChatGroupMember.query.filter_by(group_id=message.group_id, user_id=current_user_id, role='Admin').first()
        is_group_admin = bool(admin_check)
        
    if not is_sender and not is_group_admin:
        return jsonify({"error": "Unauthorized to delete this message"}), 403
        
    message.is_deleted = True
    message.deleted_at = datetime.now()
    db.session.commit()
    
    return jsonify({"message": "Message deleted successfully"}), 200
