"""
Machine management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.machine import Machine, Component
from backend.models.user import User
from backend.database import db
import os
import uuid
import qrcode
from PIL import Image
from io import BytesIO
import base64

machines_bp = Blueprint('machines', __name__)

@machines_bp.route('/', methods=['GET'])
@jwt_required()
def get_machines():
    machines = Machine.query.all()
    
    result = []
    for machine in machines:
        result.append({
            'id': machine.id,
            'name': machine.name,
            'location': machine.location,
            'description': machine.description,
            'installation_date': machine.installation_date.isoformat() if machine.installation_date else None,
            'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
            'hour_counter': machine.hour_counter,
            'qr_code': machine.qr_code
        })
    
    return jsonify(machines=result)

@machines_bp.route('/', methods=['POST'])
@jwt_required()
def create_machine():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create machines
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    # Generate unique QR code
    qr_id = str(uuid.uuid4())
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_id)
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to file
    qr_filename = f"{qr_id}.png"
    qr_path = os.path.join(current_app.config['UPLOAD_FOLDER'], qr_filename)
    qr_img.save(qr_path)
    
    machine = Machine(
        name=data.get('name'),
        location=data.get('location'),
        description=data.get('description'),
        qr_code=qr_id,
        hour_counter=data.get('hour_counter', 0)
    )
    
    db.session.add(machine)
    db.session.commit()
    
    # Convert QR to base64 for response
    buffered = BytesIO()
    qr_img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify(
        message="Machine created successfully", 
        id=machine.id,
        qr_code=qr_id,
        qr_image=img_str
    ), 201

@machines_bp.route('/<int:machine_id>/components', methods=['POST'])
@jwt_required()
def add_component(machine_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can add components                AGAIN not sure if keep
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    data = request.get_json()
    
    component = Component(
        name=data.get('name'),
        machine_id=machine.id,
        location=data.get('location'),
        function=data.get('function'),
        maintenance_requirements=data.get('maintenance_requirements'),
        potential_failures=data.get('potential_failures')
    )
    
    db.session.add(component)
    db.session.commit()
    
    return jsonify(message="Component added successfully", id=component.id), 201

@machines_bp.route('/<int:machine_id>/hour-counter', methods=['PUT'])
@jwt_required()
def update_hour_counter(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    data = request.get_json()
    new_hours = data.get('hours')
    
    if new_hours is None or not isinstance(new_hours, (int, float)):
        return jsonify(message="Invalid hour value"), 400
    
    machine.hour_counter = new_hours
    db.session.commit()
    
    return jsonify(message="Hour counter updated successfully"), 200