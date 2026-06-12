import pytest
import json
from models import db, AuditLog, BioData, ScreeningYearBioData, StaffUser, PatientPortalUser

def test_read_operation_auditing(client, setup_user):
    # 1. Mutate setup_user or get existing admin
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        admin_user = StaffUser.query.filter_by(username='admin').first()
        if admin_user:
            uid = admin_user.id
        else:
            setup_user.username = 'admin'
            db.session.commit()
            uid = setup_user.id

    # 2. Insert patient records under dcp context
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        db.session.query(BioData).filter_by(staff_id="STF999").delete()
        patient = BioData(
            staff_id="STF999",
            first_name="Jane",
            last_name="Doe",
            gender="Female",
            age=28
        )
        db.session.add(patient)
        db.session.commit()

        db.session.query(ScreeningYearBioData).filter_by(staff_id="STF999").delete()
        yearly = ScreeningYearBioData(
            staff_id="STF999",
            screening_year=2026,
            patient_id="1",
            first_name="Jane",
            last_name="Doe",
            gender="Female",
            age=28
        )
        db.session.add(yearly)
        db.session.commit()

    # 3. Call client GET
    from flask_jwt_extended import create_access_token
    access_token = create_access_token(identity=str(uid), additional_claims={"portal": "staff"})
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-Context": "dcp"
    }
    
    resp = client.get("/api/patient-report/STF999/2026", headers=headers)
    assert resp.status_code == 200
    
    # 4. Assert audit log creation
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        log = AuditLog.query.filter_by(action="VIEW_CLINICAL_RECORD", resource="Patient:STF999").order_by(AuditLog.id.desc()).first()
        assert log is not None
        assert log.correlation_id is not None
        assert log.ip_address is not None
        assert resp.headers['X-Correlation-ID'] == log.correlation_id

def test_orm_change_diff_tracking(client, setup_user):
    # 1. Insert initial patient
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        db.session.query(BioData).filter_by(staff_id="STF999").delete()
        patient = BioData(
            staff_id="STF999",
            first_name="Jane",
            last_name="Doe",
            gender="Female",
            age=28
        )
        db.session.add(patient)
        db.session.commit()

    # 2. Modify patient fields
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        patient = BioData.query.filter_by(staff_id="STF999").first()
        assert patient is not None
        
        patient.first_name = "Janet"
        patient.phone = "1234567890"
        db.session.commit()
        
    # 3. Verify audit log captures before-and-after diff
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        log = AuditLog.query.filter_by(action="UPDATE_BIODATA", resource="Patient:STF999").order_by(AuditLog.id.desc()).first()
        assert log is not None
        
        details = json.loads(log.details)
        assert 'diff' in details
        assert details['diff']['first_name'] == {"old": "Jane", "new": "Janet"}
        assert details['diff']['phone'] == {"old": None, "new": "1234567890"}



def test_audit_logs_immutability(client, setup_user):
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        admin_user = StaffUser.query.filter_by(username='admin').first()
        if admin_user:
            uid = admin_user.id
        else:
            setup_user.username = 'admin'
            db.session.commit()
            uid = setup_user.id

    from flask_jwt_extended import create_access_token
    access_token = create_access_token(identity=str(uid), additional_claims={"portal": "staff"})
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-Context": "dcp"
    }
    
    resp = client.delete("/api/admin/audit-logs/clear", headers=headers)
    assert resp.status_code == 403
    assert "immutable" in resp.json["error"]

def test_audit_log_verification(client, setup_user):
    with client.application.test_request_context(headers={'X-Company-Context': 'dcp'}):
        admin_user = StaffUser.query.filter_by(username='admin').first()
        if admin_user:
            uid = admin_user.id
        else:
            setup_user.username = 'admin'
            db.session.commit()
            uid = setup_user.id

    from flask_jwt_extended import create_access_token
    access_token = create_access_token(identity=str(uid), additional_claims={"portal": "staff"})
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Company-Context": "dcp"
    }
    
    resp = client.get("/api/admin/audit-logs/verify", headers=headers)
    assert resp.status_code == 200
    assert resp.json["verified"] is True
    assert resp.json["corrupted_count"] == 0



