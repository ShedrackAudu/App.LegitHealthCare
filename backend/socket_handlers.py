from flask import request
from flask_socketio import emit, join_room, leave_room
from models import db, User, ChatMessage, ChatGroupMember, ChatGroup
from datetime import datetime
import json

# In-memory session tracking: { user_id: { sid: True, ... } }
connected_users = {}

def init_socket_handlers(socketio):
    
    @socketio.on('connect')
    def handle_connect():
        user_id = request.args.get('user_id')
        if not user_id:
            return False
            
        user_id = int(user_id)
        sid = request.sid
        
        if user_id not in connected_users:
            connected_users[user_id] = set()
        
        connected_users[user_id].add(sid)
        
        # Mark user as online in DB
        user = User.query.get(user_id)
        if user:
            user.last_seen_at = datetime.utcnow()
            db.session.commit()
            
        # Join global user-specific room for notifications
        join_room(f"user_{user_id}")
        
        # Broadcast presence change
        emit('user_presence', {'user_id': user_id, 'status': 'online'}, broadcast=True)
        print(f"User {user_id} connected with SID {sid} and joined room user_{user_id}")

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
        room = data.get('chat_id') # e.g. group_1 or dm_5
        join_room(room)
        print(f"Joined room: {room}")

    @socketio.on('typing')
    def on_typing(data):
        room = data.get('chat_id')
        user_id = data.get('user_id')
        status = data.get('status') # 'start' or 'stop'
        emit('typing_status', {'chat_id': room, 'user_id': user_id, 'status': status}, to=room, include_self=False)

    @socketio.on('send_message')
    def on_send_message(data):
        sender_id = int(data.get('sender_id'))
        chat_id = data.get('chat_id') # d_5 or group_1
        content = data.get('content')
        msg_type = data.get('message_type', 'text')
        
        msg = ChatMessage(sender_id=sender_id, content=content, message_type=msg_type)
        
        if chat_id.startswith('dm_'):
            receiver_id = int(chat_id.split('_')[1])
            msg.receiver_id = receiver_id
        else:
            group_id = int(chat_id.split('_')[1])
            msg.group_id = group_id
            
        db.session.add(msg)
        db.session.commit()
        
        # Emit to the room (includes sender if they are in the room)
        emit('new_message', msg.to_dict(), to=chat_id)
        
        # If it's a DM, also emit to receiver's private room for global unread count/notifications
        if msg.receiver_id:
            emit('message_notification', msg.to_dict(), to=f"user_{msg.receiver_id}")
            # Note: We don't emit to user_{sender_id} here because the sender 
            # already receives it via 'to=chat_id' if they are on the messaging page.
            # If they have multiple tabs open not on the messaging page, they get it via background sync or refresh.
        else:
            # Group message notification logic
            pass

    @socketio.on('mark_read')
    def on_read(data):
        user_id = int(data.get('user_id'))
        chat_id = data.get('chat_id')
        
        if chat_id.startswith('dm_'):
            other_id = int(chat_id.split('_')[1])
            # Mark all unread messages from other_id to user_id as read
            ChatMessage.query.filter_by(sender_id=other_id, receiver_id=user_id, read_at=None).update({
                'read_at': datetime.utcnow()
            })
            db.session.commit()
            emit('messages_read', {'chat_id': chat_id, 'user_id': user_id}, to=chat_id)
        else:
            # Group read logic (more complex, using group_members.last_read_at)
            group_id = int(chat_id.split('_')[1])
            member = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
            if member:
                member.last_read_at = datetime.utcnow()
                db.session.commit()
                emit('messages_read', {'chat_id': chat_id, 'user_id': user_id}, to=chat_id)
