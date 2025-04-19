# backend/api/rcm.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.rcm import RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.models.user import User
from backend.database import db

rcm_bp = Blueprint('rcm', __name__)

# Get all RCM functions
@rcm_bp.route('/functions', methods=['GET'])
@jwt_required()
def get_functions():
    functions = RCMFunction.query.all()
    
    result = []
    for function in functions:
        result.append({
            'id': function.id,
            'name': function.name,
            'description': function.description,
            'equipment_id': function.equipment_id
        })
    
    return jsonify(functions=result)

# Create new RCM function
@rcm_bp.route('/functions', methods=['POST'])
@jwt_required()
def create_function():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create RCM data
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    function = RCMFunction(
        name=data.get('name'),
        description=data.get('description'),
        equipment_id=data.get('equipment_id')
    )
    
    db.session.add(function)
    db.session.commit()
    
    return jsonify(message="Function created successfully", id=function.id), 201

# Get complete RCM analysis
@rcm_bp.route('/analysis', methods=['GET'])
@jwt_required()
def get_rcm_analysis():
    # Optional filter by equipment
    equipment_id = request.args.get('equipment_id', type=int)
    
    query = RCMFunction.query
    
    if equipment_id:
        query = query.filter_by(equipment_id=equipment_id)
        
    functions = query.all()
    
    result = []
    for function in functions:
        function_data = {
            'id': function.id,
            'name': function.name,
            'description': function.description,
            'equipment_id': function.equipment_id,
            'functional_failures': []
        }
        
        for failure in function.functional_failures:
            failure_data = {
                'id': failure.id,
                'name': failure.name,
                'description': failure.description,
                'failure_modes': []
            }
            
            for mode in failure.failure_modes:
                mode_data = {
                    'id': mode.id,
                    'name': mode.name,
                    'description': mode.description,
                    'failure_type': mode.failure_type,
                    'detection_method': mode.detection_method,
                    'effects': [],
                    'maintenance_actions': []
                }
                
                # Get effects
                for effect in mode.effects:
                    effect_data = {
                        'id': effect.id,
                        'description': effect.description,
                        'severity': effect.severity
                    }
                    mode_data['effects'].append(effect_data)
                
                # Get maintenance actions
                maintenance_actions = RCMMaintenance.query.filter_by(failure_mode_id=mode.id).all()
                for action in maintenance_actions:
                    action_data = {
                        'id': action.id,
                        'title': action.title,
                        'description': action.description,
                        'maintenance_type': action.maintenance_type,
                        'interval_days': action.interval_days,
                        'interval_hours': action.interval_hours
                    }
                    mode_data['maintenance_actions'].append(action_data)
                
                failure_data['failure_modes'].append(mode_data)
            
            function_data['functional_failures'].append(failure_data)
        
        result.append(function_data)
    
    return jsonify(rcm_analysis=result)

# Import RCM data (for bulk upload)
@rcm_bp.route('/import', methods=['POST'])
@jwt_required()
def import_rcm_data():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only admins can import RCM data
    if user.role != 'admin':
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    try:
        # Process functions
        for function_data in data.get('functions', []):
            function = RCMFunction(
                name=function_data.get('name'),
                description=function_data.get('description'),
                equipment_id=function_data.get('equipment_id')
            )
            db.session.add(function)
            db.session.flush()  # Get ID without committing
            
            # Process functional failures
            for failure_data in function_data.get('functional_failures', []):
                failure = RCMFunctionalFailure(
                    name=failure_data.get('name'),
                    description=failure_data.get('description'),
                    function_id=function.id
                )
                db.session.add(failure)
                db.session.flush()
                
                # Process failure modes
                for mode_data in failure_data.get('failure_modes', []):
                    mode = RCMFailureMode(
                        name=mode_data.get('name'),
                        description=mode_data.get('description'),
                        failure_type=mode_data.get('failure_type'),
                        detection_method=mode_data.get('detection_method'),
                        functional_failure_id=failure.id
                    )
                    db.session.add(mode)
                    db.session.flush()
                    
                    # Process effects
                    for effect_data in mode_data.get('effects', []):
                        effect = RCMFailureEffect(
                            description=effect_data.get('description'),
                            severity=effect_data.get('severity'),
                            failure_mode_id=mode.id
                        )
                        db.session.add(effect)
                    
                    # Process maintenance actions
                    for action_data in mode_data.get('maintenance_actions', []):
                        action = RCMMaintenance(
                            title=action_data.get('title'),
                            description=action_data.get('description'),
                            maintenance_type=action_data.get('maintenance_type'),
                            interval_days=action_data.get('interval_days'),
                            interval_hours=action_data.get('interval_hours'),
                            failure_mode_id=mode.id
                        )
                        db.session.add(action)
        
        db.session.commit()
        return jsonify(message="RCM data imported successfully"), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Import failed: {str(e)}"), 500

# Generate work orders from RCM analysis
@rcm_bp.route('/generate-work-orders', methods=['POST'])
@jwt_required()
def generate_work_orders():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can generate work orders
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    equipment_id = data.get('equipment_id')
    
    if not equipment_id:
        return jsonify(message="Equipment ID is required"), 400
    
    try:
        from backend.services.work_order_generator import WorkOrderGenerator
        
        # Generate work orders based on RCM maintenance actions
        work_orders = WorkOrderGenerator.generate_from_rcm(equipment_id)
        
        return jsonify(
            message=f"Generated {len(work_orders)} work orders from RCM analysis",
            work_orders=[{
                'id': wo.id,
                'title': wo.title,
                'description': wo.description,
                'due_date': wo.due_date.isoformat()
            } for wo in work_orders]
        )
    
    except Exception as e:
        return jsonify(message=f"Failed to generate work orders: {str(e)}"), 500