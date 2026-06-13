import json
import pytest
from unittest.mock import patch, MagicMock
from flask_jwt_extended import create_access_token
from app import app
from models import db, BioData, ScreeningYearBioData, KFTResult, AISettings, User

def test_bulk_ai_remarks_kft_success(client, setup_user):
    token = create_access_token(identity=str(setup_user.id))
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # Clean existing data to avoid conflicts
    db.session.query(ScreeningYearBioData).delete()
    db.session.query(BioData).delete()
    db.session.query(KFTResult).delete()
    db.session.query(AISettings).delete()
    db.session.commit()

    # Create dummy AI settings
    ai_settings = AISettings(
        api_key='fake-key',
        model_selection='gpt-4o'
    )
    db.session.add(ai_settings)

    # Create Patient BioData
    bio = BioData(
        staff_id='STF_KFT_TEST',
        first_name='John',
        last_name='Doe',
        gender='Male',
        age=30
    )
    db.session.add(bio)

    # Link BioData to Screening Year
    screening_bio = ScreeningYearBioData(
        patient_id='P100',
        staff_id='STF_KFT_TEST',
        screening_year=2026
    )
    db.session.add(screening_bio)

    # Create KFT Result
    kft_result = KFTResult(
        staff_id='STF_KFT_TEST',
        screening_year=2026,
        potassium='4.2',
        sodium='140',
        chloride='102',
        hco3='22.0',
        bicarbonate_ca='2.4'
    )
    db.session.add(kft_result)
    db.session.commit()

    # Mock OpenAI API call
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    mock_message.content = "Normal kidney function."
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    with patch('models.User.has_permission', return_value=True):
        with patch('openai.OpenAI') as mock_openai_class:
            mock_client = MagicMock()
            mock_openai_class.return_value = mock_client
            mock_client.chat.completions.create.return_value = mock_response

            # Request body
            payload = {
                "range": "P100-P100",
                "screening_year": 2026,
                "override": True
            }

            response = client.post('/api/tests/bulk-ai-remarks/kft', headers=headers, data=json.dumps(payload))
            
            # Verify status code
            assert response.status_code == 200
            
            # Verify JSON content
            data = json.loads(response.data)
            assert data['processed_count'] == 1
            assert len(data['errors']) == 0
            assert data['processed'][0]['patient_id'] == 'P100'
            assert data['processed'][0]['remark'] == 'Normal kidney function.'

            # Verify database update
            updated_kft = KFTResult.query.filter_by(staff_id='STF_KFT_TEST', screening_year=2026).first()
            assert updated_kft.kft_remark == 'Normal kidney function.'
