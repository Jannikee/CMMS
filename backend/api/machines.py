"""
Machine and hierarchy management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.machine import Machine, Subsystem, Component
from backend.models.user import User
from backend.database import db
from backend.services.technical_id_service import TechnicalIDService
import os
import uuid
import qrcode
from PIL import Image
from io import BytesIO
import base64
import re  # For technical ID validation
from werkzeug.utils import secure_filename

machines_bp = Blueprint('machines', __name__)

# Machine endpoints
@machines_bp.route('/', methods=['GET'])
@jwt_required()
def get_machines():
    machines = Machine.query.all()
    
    result = []
    for machine in machines:
        result.append({
            'id': machine.id,
            'name': machine.name,
            'technical_id': machine.technical_id,
            'location': machine.location,
            'description': machine.description,
            'installation_date': machine.installation_date.isoformat() if machine.installation_date else None,
            'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
            'hour_counter': machine.hour_counter,
            'qr_code': machine.qr_code,
            'subsystem_count': len(machine.subsystems)
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
    
    # Validate technical ID
    technical_id = data.get('technical_id')
    is_valid, error_message = TechnicalIDService.validate_hierarchy(technical_id, 'machine')
    if not is_valid:
        return jsonify(message=error_message), 400
    
    # Check if technical ID already exists
    existing = Machine.query.filter_by(technical_id=technical_id).first()
    if existing:
        return jsonify(message="Machine with this technical ID already exists"), 400
    
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
    
    # Create machine
    machine = Machine(
        name=data.get('name'),
        technical_id=technical_id,
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
        technical_id=machine.technical_id,
        qr_code=qr_id,
        qr_image=img_str
    ), 201

@machines_bp.route('/<int:machine_id>', methods=['GET'])
@jwt_required()
def get_machine(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    # Get subsystems for this machine
    subsystems = Subsystem.query.filter_by(machine_id=machine_id).all()
    subsystem_list = []
    
    for subsystem in subsystems:
        component_count = Component.query.filter_by(subsystem_id=subsystem.id).count()
        
        subsystem_list.append({
            'id': subsystem.id,
            'name': subsystem.name,
            'technical_id': subsystem.technical_id,
            'description': subsystem.description,
            'component_count': component_count
        })
    
    result = {
        'id': machine.id,
        'name': machine.name,
        'technical_id': machine.technical_id,
        'location': machine.location,
        'description': machine.description,
        'installation_date': machine.installation_date.isoformat() if machine.installation_date else None,
        'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
        'hour_counter': machine.hour_counter,
        'qr_code': machine.qr_code,
        'subsystems': subsystem_list
    }
    
    return jsonify(machine=result)

# Subsystem endpoints
@machines_bp.route('/<int:machine_id>/subsystems', methods=['GET'])
@jwt_required()
def get_subsystems(machine_id):
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    subsystems = Subsystem.query.filter_by(machine_id=machine_id).all()
    
    result = []
    for subsystem in subsystems:
        result.append({
            'id': subsystem.id,
            'name': subsystem.name,
            'technical_id': subsystem.technical_id,
            'description': subsystem.description,
            'machine_id': subsystem.machine_id,
            'component_count': Component.query.filter_by(subsystem_id=subsystem.id).count()
        })
    
    return jsonify(subsystems=result)

@machines_bp.route('/<int:machine_id>/subsystems', methods=['POST'])
@jwt_required()
def create_subsystem(machine_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create subsystems
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    data = request.get_json()
    
    # Validate technical ID
    technical_id = data.get('technical_id')
    is_valid, error_message = TechnicalIDService.validate_hierarchy(technical_id, 'subsystem', machine.technical_id)
    if not is_valid:
        return jsonify(message=error_message), 400
    
    # Check if subsystem with this technical_id already exists
    existing = Subsystem.query.filter_by(technical_id=technical_id).first()
    if existing:
        return jsonify(message="Subsystem with this technical ID already exists"), 400
    
    subsystem = Subsystem(
        name=data.get('name'),
        technical_id=technical_id,
        description=data.get('description'),
        machine_id=machine.id
    )
    
    db.session.add(subsystem)
    db.session.commit()
    
    return jsonify(
        message="Subsystem created successfully", 
        id=subsystem.id,
        technical_id=subsystem.technical_id
    ), 201

@machines_bp.route('/subsystems/<int:subsystem_id>', methods=['GET'])
@jwt_required()
def get_subsystem(subsystem_id):
    subsystem = Subsystem.query.get(subsystem_id)
    if not subsystem:
        return jsonify(message="Subsystem not found"), 404
    
    # Get all components in this subsystem
    components = Component.query.filter_by(subsystem_id=subsystem_id).all()
    component_list = []
    
    for component in components:
        component_list.append({
            'id': component.id,
            'name': component.name,
            'technical_id': component.technical_id,
            'location': component.location,
            'function': component.function,
            'installation_date': component.installation_date.isoformat() if component.installation_date else None
        })
    
    result = {
        'id': subsystem.id,
        'name': subsystem.name,
        'technical_id': subsystem.technical_id,
        'description': subsystem.description,
        'machine_id': subsystem.machine_id,
        'machine_name': subsystem.machine.name,
        'components': component_list
    }
    
    return jsonify(subsystem=result)

# Component endpoints
@machines_bp.route('/subsystems/<int:subsystem_id>/components', methods=['GET'])
@jwt_required()
def get_components(subsystem_id):
    subsystem = Subsystem.query.get(subsystem_id)
    if not subsystem:
        return jsonify(message="Subsystem not found"), 404
    
    components = Component.query.filter_by(subsystem_id=subsystem_id).all()
    
    result = []
    for component in components:
        result.append({
            'id': component.id,
            'name': component.name,
            'technical_id': component.technical_id,
            'location': component.location,
            'function': component.function,
            'installation_date': component.installation_date.isoformat() if component.installation_date else None,
            'maintenance_requirements': component.maintenance_requirements,
            'subsystem_id': component.subsystem_id,
            'machine_id': component.machine_id
        })
    
    return jsonify(components=result)

@machines_bp.route('/subsystems/<int:subsystem_id>/components', methods=['POST'])
@jwt_required()
def create_component(subsystem_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can add components
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    subsystem = Subsystem.query.get(subsystem_id)
    if not subsystem:
        return jsonify(message="Subsystem not found"), 404
    
    data = request.get_json()
    
    # Validate technical ID
    technical_id = data.get('technical_id')
    is_valid, error_message = TechnicalIDService.validate_hierarchy(technical_id, 'component', subsystem.technical_id)
    if not is_valid:
        return jsonify(message=error_message), 400
    
    # Check for duplicate technical_id
    existing = Component.query.filter_by(technical_id=technical_id).first()
    if existing:
        return jsonify(message="Component with this technical ID already exists"), 400
    
    component = Component(
        name=data.get('name'),
        technical_id=technical_id,
        machine_id=subsystem.machine_id,
        subsystem_id=subsystem.id,
        location=data.get('location'),
        function=data.get('function'),
        maintenance_requirements=data.get('maintenance_requirements'),
        potential_failures=data.get('potential_failures')
    )
    
    db.session.add(component)
    db.session.commit()
    
    return jsonify(
        message="Component added successfully", 
        id=component.id,
        technical_id=component.technical_id
    ), 201

@machines_bp.route('/components/<int:component_id>', methods=['GET'])
@jwt_required()
def get_component(component_id):
    component = Component.query.get(component_id)
    if not component:
        return jsonify(message="Component not found"), 404
    
    result = {
        'id': component.id,
        'name': component.name,
        'technical_id': component.technical_id,
        'location': component.location,
        'function': component.function,
        'installation_date': component.installation_date.isoformat() if component.installation_date else None,
        'maintenance_requirements': component.maintenance_requirements,
        'potential_failures': component.potential_failures,
        'subsystem_id': component.subsystem_id,
        'subsystem_name': component.subsystem.name,
        'machine_id': component.machine_id,
        'machine_name': component.machine.name
    }
    
    return jsonify(component=result)
#added qr
@machines_bp.route('/qrcode/<qr_code>', methods=['GET'])
@jwt_required()
def get_machine_by_qrcode(qr_code):
    """Get machine details by QR code"""
    machine = Machine.query.filter_by(qr_code=qr_code).first()
    
    if not machine:
        return jsonify(message="Machine not found for this QR code"), 404
    
    # Return machine details
    result = {
        'id': machine.id,
        'name': machine.name,
        'technical_id': machine.technical_id,
        'location': machine.location,
        'description': machine.description,
        'installation_date': machine.installation_date.isoformat() if machine.installation_date else None,
        'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
        'hour_counter': machine.hour_counter,
        'qr_code': machine.qr_code
    }
    
    return jsonify(machine=result)

@machines_bp.route('/<int:machine_id>/hours', methods=['PUT'])
@jwt_required()
def update_machine_hours(machine_id):
    """Update machine hour counter"""
    current_user_id = get_jwt_identity()
    
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    data = request.get_json()
    hour_counter = data.get('hour_counter')
    
    if hour_counter is None:
        return jsonify(message="Hour counter value is required"), 400
    
    # Update the hour counter
    machine.hour_counter = float(hour_counter)
    
    # Log the update as a maintenance activity
    maintenance_log = MaintenanceLog(
        description=f"Hour counter updated to {hour_counter}",
        machine_id=machine_id,
        performed_by=current_user_id,
        maintenance_type="hour_update",
        maintenance_category="monitoring",
        hour_counter=float(hour_counter),
        has_deviation=False
    )
    
    db.session.add(maintenance_log)
    db.session.commit()
    
    return jsonify(
        message="Machine hour counter updated successfully",
        hour_counter=machine.hour_counter
    )
@machines_bp.route('/upload-structure', methods=['OPTIONS'])
def options_upload_structure():
    # Handle preflight request
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    return response

@machines_bp.route('/upload-structure', methods=['POST'])
@jwt_required()
def upload_technical_structure():
    from werkzeug.utils import secure_filename
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can import structure
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    if 'file' not in request.files:
        return jsonify(message="No file part"), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify(message="No selected file"), 400
    
    # Check file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify(message="Invalid file format, only Excel files are allowed"), 400
    
    # Get import mode
    import_mode = request.form.get('import_mode', 'equipment')
    
    # If equipment-specific mode, validate equipment_id
    if import_mode == 'equipment':
        equipment_id = request.form.get('equipment_id')
        if not equipment_id:
            return jsonify(message="Equipment ID is required for equipment-specific import"), 400
        
        # Verify the equipment exists
        equipment = Machine.query.get(equipment_id)
        if not equipment:
            return jsonify(message="Equipment not found"), 404
    
    # Add the unique filename generation here
    import uuid
    unique_id = str(uuid.uuid4())
    original_filename = file.filename
    unique_filename = f"{unique_id}_{secure_filename(original_filename)}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    
    # Save file with the unique name
    file.save(file_path)
    
    try:
        # Import the services
        from backend.services.import_service import import_technical_structure_park, import_technical_structure_equipment
        
        # Process the file based on import mode
        if import_mode == 'park':
            # Import entire machine park
            result = import_technical_structure_park(file_path)
        else:
            # Import components for specific equipment
            result = import_technical_structure_equipment(file_path, equipment_id)
        
        # Try to remove the temporary file but don't fail if it's locked
        try:
            os.remove(file_path)
        except PermissionError:
            # If we can't delete the file now, don't throw an error
            print(f"Note: Could not immediately delete file {file_path} - it may be deleted later")
        
        if result['success']:
            return jsonify(
                message=result['message'],
                imported=result['stats']
            ), 201
        else:
            return jsonify(message=result['message']), 400
        
    except Exception as e:
        # Enhanced error logging
        print(f"ERROR in upload_technical_structure: {str(e)}")
        print(f"ERROR type: {type(e).__name__}")
        
        import traceback
        print("ERROR traceback:")
        print(traceback.format_exc())
        
        # Try to remove file but don't worry if it fails
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        
        return jsonify(message=f"Error processing file: {str(e)}"), 500