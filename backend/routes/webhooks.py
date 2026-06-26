from flask import Blueprint, request, jsonify, current_app
import threading
from extensions import socketio
from models import db, SystemConfig

webhooks_bp = Blueprint('webhooks', __name__)

def find_commit_hash(data):
    """
    Recursively searches a nested JSON/dictionary structure for a Git commit hash.
    Matches any 7-40 character hexadecimal string that is associated with keys like
    'commit', 'hash', 'rev', 'sha', or 'id'.
    """
    import re
    hex_pattern = re.compile(r'^[0-9a-fA-F]{7,40}$')
    
    if isinstance(data, dict):
        for k, v in data.items():
            k_lower = k.lower()
            if isinstance(v, str):
                v_clean = v.strip()
                if any(x in k_lower for x in ['commit', 'hash', 'rev', 'sha', 'id']):
                    if hex_pattern.match(v_clean):
                        return v_clean
        # Recurse values
        for v in data.values():
            res = find_commit_hash(v)
            if res:
                return res
    elif isinstance(data, list):
        for item in data:
            res = find_commit_hash(item)
            if res:
                return res
    return None

def broadcast_update_notification(app, commit_hash):
    """
    Timer callback function that runs in a background thread to broadcast
    the app update event to all connected clients.
    """
    with app.app_context():
        try:
            print(f"[DEPLOY WEBHOOK] Broadcasting update event to clients for commit: {commit_hash}")
            socketio.emit('app_update_available', {
                'commit': commit_hash,
                'message': 'A new version of the application has been successfully deployed.'
            }, namespace='/')
        except Exception as e:
            print(f"[DEPLOY WEBHOOK] Failed to emit socket event: {str(e)}")

@webhooks_bp.route('/render-deploy', methods=['POST'])
def handle_render_deploy():
    """
    Endpoint that receives Render's Deploy Succeeded Webhook.
    """
    try:
        data = request.json or {}
    except Exception:
        data = {}
        
    commit_param = request.args.get('commit')
    event_param = request.args.get('event')
    status_param = request.args.get('status')
    
    event = data.get('event') or event_param
    deploy_data = data.get('deploy')
    if not isinstance(deploy_data, dict):
        deploy_data = {}
        
    status = deploy_data.get('status') or status_param
    
    # If event/status is provided, verify it is a success; otherwise, allow it.
    if event and isinstance(event, str):
        event_lower = event.lower()
        if event_lower not in ['deploy.succeeded', 'deploy.live'] and 'success' not in event_lower and 'live' not in event_lower:
            # Also check status
            if status and isinstance(status, str) and status.lower() not in ['live', 'succeeded']:
                return jsonify({"message": "Ignored non-success deploy event"}), 200
                
    commit_hash = None
    
    # Check query parameter first
    if commit_param and isinstance(commit_param, str) and commit_param != 'latest':
        commit_hash = commit_param.strip()
        
    # Check nested commit object in deploy_data
    if not commit_hash:
        commit_obj = deploy_data.get('commit')
        if isinstance(commit_obj, dict):
            commit_hash = commit_obj.get('id')
        elif isinstance(commit_obj, str):
            commit_hash = commit_obj
            
    # Check direct keys
    if not commit_hash:
        for key in ['commit', 'commit_hash', 'hash', 'revision', 'commitId', 'sha']:
            val = data.get(key)
            if isinstance(val, str):
                commit_hash = val
                break
            elif isinstance(val, dict):
                commit_hash = val.get('id') or val.get('hash')
                if commit_hash:
                    break
                    
    # Recursive search fallback
    if not commit_hash:
        commit_hash = find_commit_hash(data)
        
    # Formatting
    if commit_hash and isinstance(commit_hash, str) and commit_hash != 'latest':
        commit_hash = commit_hash.strip()[:7]
    else:
        commit_hash = 'latest'
        
    # Store the latest deployed commit hash in SystemConfig
    try:
        config_hash = SystemConfig.query.get('last_deployed_commit')
        if not config_hash:
            config_hash = SystemConfig(key='last_deployed_commit', value=commit_hash, description='Latest deployed commit hash')
            db.session.add(config_hash)
        else:
            config_hash.value = commit_hash
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[DEPLOY WEBHOOK] Failed to save commit hash to DB: {str(e)}")

    # Get the active app instance to pass to the thread context
    try:
        app = current_app._get_current_object()
        print(f"[DEPLOY WEBHOOK] Received deploy success. Commit: {commit_hash}. Scheduling instantaneous notification...")
        timer = threading.Timer(1.0, broadcast_update_notification, args=[app, commit_hash])
        timer.daemon = True
        timer.start()
    except Exception as e:
        print(f"[DEPLOY WEBHOOK] Failed to schedule broadcast: {str(e)}")
        
    return jsonify({
        "status": "success",
        "message": "Deployment webhook received. Update notification scheduled.",
        "commit": commit_hash
    }), 200

@webhooks_bp.route('/version-check', methods=['GET'])
def version_check():
    """
    Returns the latest deployed commit hash. It prioritizes the latest commit hash
    received via the render-deploy webhook (saved to the DB), falling back to the
    running backend instance environment variable. This ensures frontend-only deploys
    are immediately detected by clients.
    """
    import os
    config_hash = SystemConfig.query.get('last_deployed_commit')
    latest_hash = config_hash.value if config_hash else None
    
    if not latest_hash or latest_hash == 'latest':
        env_hash = os.environ.get('RENDER_GIT_COMMIT', 'latest')
        latest_hash = env_hash[:7] if (env_hash and env_hash != 'latest') else 'latest'
        
    return jsonify({
        "commit": latest_hash
    }), 200

