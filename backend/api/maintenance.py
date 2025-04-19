"""
Maintenance data routes
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.maintenance_log import MaintenanceLog
from backend.models.failure import Failure, FailureImage
from backend.models.machine import Machine, Component
from backend.models.user import User
from backend.models.work_order import WorkOrder
from backend.database import db
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename

maintenance_bp = Blueprint('maintenance', __name__)

@maintenance_bp.route('/', methods=['POST'])
@jwt_required()
def add_maintenance_log():
    current_user_id = get_jwt_identity()
    
    # Check if form data or JSON
    if request.content_type.startswith('multipart/form-data'):
        data = request.form
        files = request.files.getlist('images')
    else:
        data = request.get_json()
        files = []
    
    # Required fields
    machine_id = data.get('machine_id')
    description = data.get('description')
    
    if not machine_id or not description:
        return jsonify(message="Machine ID and description are required"), 400
    
    # Optional fields
    component_id = data.get('component_id')
    work_order_id = data.get('work_order_id')
    maintenance_type = data.get('maintenance_type')
    maintenance_category = data.get('maintenance_category')
    hour_counter = data.get('hour_counter')
    has_deviation = data.get('has_deviation') == 'true' or data.get('has_deviation') == True
    
    # Validate related objects exist
    machine = Machine.query.get(machine_id)
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    if component_id:
        component = Component.query.get(component_id)
        if not component:
            return jsonify(message="Component not found"), 404
    
    if work_order_id:
        work_order = WorkOrder.query.get(work_order_id)
        if not work_order:
            return jsonify(message="Work order not found"), 404
    
    # Create maintenance log
    maintenance_log = MaintenanceLog(
        description=description,
        machine_id=machine_id,
        component_id=component_id,
        performed_by=current_user_id,
        work_order_id=work_order_id,
        maintenance_type=maintenance_type,
        maintenance_category=maintenance_category,
        hour_counter=float(hour_counter) if hour_counter else None,
        has_deviation=has_deviation
    )
    
    db.session.add(maintenance_log)
    db.session.flush()  # Get ID without committing
    
    # If there's a deviation, record it
    if has_deviation:
        deviation_description = data.get('deviation_description')
        deviation_severity = data.get('deviation_severity', 'minor')
        
        if not deviation_description:
            return jsonify(message="Deviation description is required when has_deviation is true"), 400
        
        failure = Failure(
            maintenance_log_id=maintenance_log.id,
            description=deviation_description,
            severity=deviation_severity
        )
        
        db.session.add(failure)
        db.session.flush()  # Get ID without committing
        
        # Process image uploads if any
        if files:
            for file in files:
                if file and file.filename:
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    
                    # Create failure image record
                    failure_image = FailureImage(
                        failure_id=failure.id,
                        image_path=unique_filename
                    )
                    db.session.add(failure_image)
        
        # Update machine last_maintenance field
        machine.last_maintenance = datetime.utcnow()
        
        # If work order exists, update its status
        if work_order_id:
            work_order = WorkOrder.query.get(work_order_id)
            work_order.status = 'completed'
    
    db.session.commit()
    
    return jsonify(message="Maintenance log added successfully", id=maintenance_log.id), 201

@maintenance_bp.route('/', methods=['GET'])
@jwt_required()
def get_maintenance_logs():
    # Filter parameters
    machine_id = request.args.get('machine_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = db.session.query(
        MaintenanceLog,
        Machine.name.label('machine_name'),
        User.username.label('performed_by_name')
    ).join(
        Machine, MaintenanceLog.machine_id == Machine.id
    ).join(
        User, MaintenanceLog.performed_by == User.id
    )
    
    if machine_id:
        query = query.filter(MaintenanceLog.machine_id == machine_id)
        
    if start_date:
        query = query.filter(MaintenanceLog.timestamp >= datetime.fromisoformat(start_date))
        
    if end_date:
        query = query.filter(MaintenanceLog.timestamp <= datetime.fromisoformat(end_date))
    
    # Order by timestamp descending (newest first)
    query = query.order_by(MaintenanceLog.timestamp.desc())
    
    results = query.all()
    
    logs = []
    for result in results:
        log = result[0]
        
        # Check if there are failures associated with this log
        failures = Failure.query.filter_by(maintenance_log_id=log.id).all()
        failure_data = []
        
        for failure in failures:
            # Get images for this failure
            images = FailureImage.query.filter_by(failure_id=failure.id).all()
            image_urls = [f"/api/uploads/{image.image_path}" for image in images]
            
            failure_data.append({
                'id': failure.id,
                'description': failure.description,
                'severity': failure.severity,
                'resolution': failure.resolution,
                'images': image_urls
            })
        
        logs.append({
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'description': log.description,
            'machine_id': log.machine_id,
            'machine_name': result.machine_name,
            'component_id': log.component_id,
            'performed_by': log.performed_by,
            'performed_by_name': result.performed_by_name,
            'work_order_id': log.work_order_id,
            'maintenance_type': log.maintenance_type,
            'maintenance_category': log.maintenance_category,
            'hour_counter': log.hour_counter,
            'has_deviation': log.has_deviation,
            'failures': failure_data
        })
    
    return jsonify(maintenance_logs=logs)