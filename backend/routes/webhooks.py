from flask import Blueprint, request, jsonify, current_app
import threading
from extensions import socketio
from models import db, SystemConfig

webhooks_bp = Blueprint('webhooks', __name__)

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
            })
        except Exception as e:
            print(f"[DEPLOY WEBHOOK] Failed to emit socket event: {str(e)}")

@webhooks_bp.route('/render-deploy', methods=['POST'])
def handle_render_deploy():
    """
    Endpoint that receives Render's Deploy Succeeded Webhook.
    """
    data = request.json or {}
    
    # Render's webhooks send a JSON payload. We check if it indicates success.
    # Standard Render deploy webhook events: "deploy.succeeded", "deploy.live", etc.
    event = data.get('event')
    deploy_data = data.get('deploy', {})
    status = deploy_data.get('status')
    
    # If a payload is provided, verify it is a success event; otherwise, support manual/generic triggers.
    if event and event not in ['deploy.succeeded', 'deploy.live'] and status not in ['live', 'succeeded']:
        return jsonify({"message": "Ignored non-success deploy event"}), 200
        
    commit_hash = deploy_data.get('commit', {}).get('id', 'latest')
    
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
    app = current_app._get_current_object()
    
    # Schedule the socket emit to run in 5 minutes (300 seconds)
    print(f"[DEPLOY WEBHOOK] Received deploy success for commit {commit_hash}. Scheduling notification in 5 minutes...")
    timer = threading.Timer(300.0, broadcast_update_notification, args=[app, commit_hash])
    timer.daemon = True
    timer.start()
    
    return jsonify({
        "status": "success",
        "message": "Deployment webhook received. Update notification scheduled in 5 minutes.",
        "commit": commit_hash
    }), 200

@webhooks_bp.route('/version-check', methods=['GET'])
def version_check():
    """
    Returns the latest deployed commit hash to allow client comparison on login/load.
    """
    import os
    config_hash = SystemConfig.query.get('last_deployed_commit')
    latest_hash = config_hash.value if config_hash else None
    
    # Fallback to environment variable if database does not have it yet
    if not latest_hash or latest_hash == 'latest':
        latest_hash = os.environ.get('RENDER_GIT_COMMIT', 'latest')
        
    return jsonify({
        "commit": latest_hash
    }), 200

