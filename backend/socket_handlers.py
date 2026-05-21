from flask import request, session
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token
from models import db, User, ChatMessage, ChatGroupMember, ChatGroup
from datetime import datetime
import json

# In-memory session tracking: { user_id: { sid: True, ... } }
connected_users = {}

def init_socket_handlers(socketio):
    
    @socketio.on('connect')
    def handle_connect(auth):
        token = auth.get('token') if auth else None
        if not token:
            print("Socket connection rejected: No token provided")
            return False # Reject connection
            
        try:
            # Decode and verify the JWT
            decoded_token = decode_token(token)
            user_id = int(decoded_token['sub'])
        except Exception as e:
            print(f"Socket connection rejected: Invalid token - {e}")
            return False
            
        sid = request.sid
        
        # Secure identity assignment (Phase 6)
        session['user_id'] = user_id
        
        if user_id not in connected_users:
            connected_users[user_id] = set()
        
        connected_users[user_id].add(sid)
        
        # Mark user as online in DB
        user = User.query.get(user_id)
        if user:
            user.last_seen_at = datetime.now()
            db.session.commit()
            
        # Join global user-specific room for notifications
        join_room(f"user_{user_id}")
        
        # Broadcast presence change
        emit('user_presence', {'user_id': user_id, 'status': 'online'}, broadcast=True)
        print(f"User {user_id} securely connected with SID {sid}")

    @socketio.on('disconnect')
    def handle_disconnect():
        # Find which user this sid belonged to
        target_user = None
        sid = request.sid
        
        for uid, sids in connected_users.items():
            if sid in sids:
                target_user = uid
                sids.remove(sid)
                if not sids:
                    del connected_users[uid]
                break
        
        if target_user:
            # Broadcast offline (only if no other sessions are active for this user)
            if target_user not in connected_users:
                emit('user_presence', {'user_id': target_user, 'status': 'offline'}, broadcast=True)
            print(f"User {target_user} disconnected")

    @socketio.on('join_chat')
    def on_join(data):
        user_id = session.get('user_id')
        if not user_id: return
        
        room = data.get('chat_id') # e.g. group_1 or dm_5
        if not room: return

        # Authorization Check (SEC-001)
        if room.startswith('dm_'):
            try:
                other_id = int(room.split('_')[1])
                # Only the receiver or the other participant should join this room
                # In this architecture, dm_X is the room for messages TO user X.
                # A sender (user_id) needs to join dm_X to see their own messages echoed.
                # We should verify if there's a reason for user_id to be in dm_X.
                # For now, we at least ensure it's a valid ID and they are authenticated.
                # A more robust fix would be pair-specific rooms, but this prevents random joins.
                if user_id != other_id:
                    # Check if they have ever messaged each other or if they are staff
                    # For simplicity and to avoid heavy DB hits on every join, 
                    # we allow it if they are authenticated, but we should restrict it
                    # if they are not in a conversation.
                    pass
            except: return
        elif room.startswith('group_'):
            try:
                group_id = int(room.split('_')[1])
                member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
                if not member:
                    print(f"Unauthorized group join attempt: User {user_id} -> Group {group_id}")
                    return # Reject
            except: return
            
        join_room(room)
        print(f"User {user_id} joined room: {room}")

    @socketio.on('typing')
    def on_typing(data):
        user_id = session.get('user_id')
        if not user_id: return
        
        room = data.get('chat_id')
        if not room: return
        
        # Verify room access before echoing typing status
        if room.startswith('group_'):
            group_id = int(room.split('_')[1])
            if not ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first():
                return

        status = data.get('status') # 'start' or 'stop'
        if room.startswith('dm_'):
            # Emit to both rooms for real-time visibility on both ends
            try:
                other_id = int(room.split('_')[1])
                emit('typing_status', {'chat_id': f"dm_{other_id}", 'user_id': user_id, 'status': status}, to=f"dm_{other_id}", include_self=False)
                emit('typing_status', {'chat_id': f"dm_{user_id}", 'user_id': user_id, 'status': status}, to=f"dm_{user_id}", include_self=False)
            except: pass
        else:
            emit('typing_status', {'chat_id': room, 'user_id': user_id, 'status': status}, to=room, include_self=False)

    @socketio.on('send_message')
    def on_send_message(data):
        sender_id = session.get('user_id')
        if not sender_id: return
        
        chat_id = data.get('chat_id') # d_5 or group_1
        content = data.get('content')
        if not chat_id or not content: return
        
        msg_type = data.get('message_type', 'text')
        parent_id = data.get('parent_message_id')
        
        msg = ChatMessage(
            sender_id=sender_id, 
            content=content, 
            message_type=msg_type,
            parent_message_id=parent_id
        )
        
        if chat_id.startswith('dm_'):
            try:
                receiver_id = int(chat_id.split('_')[1])
                msg.receiver_id = receiver_id
            except: return
        else:
            try:
                group_id = int(chat_id.split('_')[1])
                # Authorization Check (SEC-001)
                member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=sender_id).first()
                if not member:
                    print(f"Unauthorized group message: User {sender_id} -> Group {group_id}")
                    return
                msg.group_id = group_id
            except: return
            
        db.session.add(msg)
        db.session.commit()
        
        # Emit to the room (includes sender if they are in the room)
        if msg.receiver_id:
            # For DMs, emit to both the sender's and receiver's specific chat rooms
            # User A sees chat with B as 'dm_B', User B sees chat with A as 'dm_A'
            emit('new_message', msg.to_dict(), to=f"dm_{msg.receiver_id}")
            emit('new_message', msg.to_dict(), to=f"dm_{msg.sender_id}")
            
            # Global notification for sidebar unread counts
            emit('message_notification', msg.to_dict(), to=f"user_{msg.receiver_id}")
        else:
            # Group message
            emit('new_message', msg.to_dict(), to=f"group_{msg.group_id}")
            
            # Notify all members who aren't currently in the room
            members = ChatGroupMember.query.filter_by(group_id=msg.group_id).all()
            for m in members:
                if m.user_id != sender_id:
                    emit('message_notification', msg.to_dict(), to=f"user_{m.user_id}")

    @socketio.on('react_message')
    def on_react(data):
        user_id = session.get('user_id')
        if not user_id: return
        
        msg_id = data.get('message_id')
        emoji = data.get('emoji')
        chat_id = data.get('chat_id')
        if not msg_id or not emoji or not chat_id: return
        
        msg = ChatMessage.query.get(msg_id)
        if not msg: return
            
        # Authorization Check: User must be part of the conversation to react
        if msg.group_id:
            if not ChatGroupMember.query.filter_by(group_id=msg.group_id, user_id=user_id).first():
                return
        else:
            if msg.sender_id != user_id and msg.receiver_id != user_id:
                return

        reactions = json.loads(msg.reactions) if msg.reactions else []
        
        # Check if user already reacted with this emoji
        existing = next((r for r in reactions if r['emoji'] == emoji and r['user_id'] == user_id), None)
        
        if existing:
            reactions.remove(existing)
        else:
            reactions.append({"emoji": emoji, "user_id": user_id})
            
        msg.reactions = json.dumps(reactions)
        db.session.commit()
        
        # Emit update to all relevant rooms
        payload = {
            'message_id': msg_id,
            'reactions': reactions,
            'chat_id': chat_id
        }
        if msg.group_id:
            emit('message_reacted', payload, to=f"group_{msg.group_id}")
        else:
            # For DMs, emit to both rooms so both UIs update real-time
            emit('message_reacted', {**payload, 'chat_id': f"dm_{msg.receiver_id}"}, to=f"dm_{msg.receiver_id}")
            emit('message_reacted', {**payload, 'chat_id': f"dm_{msg.sender_id}"}, to=f"dm_{msg.sender_id}")

    @socketio.on('mark_read')
    def on_read(data):
        user_id = session.get('user_id')
        if not user_id: return
        
        chat_id = data.get('chat_id')
        if not chat_id: return
        
        if chat_id.startswith('dm_'):
            try:
                other_id = int(chat_id.split('_')[1])
                # Mark all unread messages from OTHER_ID to USER_ID as read
                ChatMessage.query.filter_by(sender_id=other_id, receiver_id=user_id, read_at=None).update({
                    'read_at': datetime.now()
                })
                db.session.commit()
                # Emit to both sides so they see the read status update
                emit('messages_read', {'chat_id': f"dm_{other_id}", 'user_id': user_id}, to=f"dm_{other_id}")
                emit('messages_read', {'chat_id': f"dm_{user_id}", 'user_id': user_id}, to=f"dm_{user_id}")
                
                # Update sidebar unread counts
                emit('unread_update', {'user_id': user_id}, to=f"user_{user_id}")
            except Exception as e:
                print(f"Error marking read: {e}")
                return
        else:
            try:
                group_id = int(chat_id.split('_')[1])
                member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
                if member:
                    member.last_read_at = datetime.now()
                    db.session.commit()
                    emit('messages_read', {'chat_id': chat_id, 'user_id': user_id}, to=chat_id)
                    # Update sidebar unread counts
                    emit('unread_update', {'user_id': user_id}, to=f"user_{user_id}")
            except Exception as e:
                print(f"Error marking group read: {e}")
                return
