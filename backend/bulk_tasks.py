"""
In-memory task store for tracking background bulk AI remark generation.

Each task is a dict stored in _tasks keyed by a UUID task_id.
Tasks auto-expire after 1 hour to prevent memory leaks.
"""
import time
import threading

_tasks = {}
_lock = threading.Lock()


def create_task(task_id, total):
    """Initialize a new task entry."""
    with _lock:
        _tasks[task_id] = {
            "status": "running",
            "total": total,
            "processed_count": 0,
            "error_count": 0,
            "processed": [],
            "errors": [],
            "created_at": time.time(),
        }


def update_task_success(task_id, patient_id, remark):
    """Record a successful remark generation."""
    with _lock:
        task = _tasks.get(task_id)
        if task:
            task["processed_count"] += 1
            task["processed"].append({"patient_id": patient_id, "remark": remark})


def update_task_error(task_id, patient_id, error):
    """Record a failed remark generation."""
    with _lock:
        task = _tasks.get(task_id)
        if task:
            task["error_count"] += 1
            task["errors"].append({"patient_id": patient_id, "error": error})


def complete_task(task_id):
    """Mark a task as completed."""
    with _lock:
        task = _tasks.get(task_id)
        if task:
            task["status"] = "completed"


def fail_task(task_id, error_message):
    """Mark a task as failed due to a critical error."""
    with _lock:
        task = _tasks.get(task_id)
        if task:
            task["status"] = "failed"
            task["error_message"] = error_message


def get_task(task_id):
    """Return a snapshot of the current task state."""
    with _lock:
        task = _tasks.get(task_id)
        if task:
            return dict(task)  # shallow copy
        return None


def cleanup_old_tasks(max_age_seconds=3600):
    """Remove tasks older than max_age_seconds (default 1 hour)."""
    now = time.time()
    with _lock:
        expired = [tid for tid, t in _tasks.items() if now - t["created_at"] > max_age_seconds]
        for tid in expired:
            del _tasks[tid]
