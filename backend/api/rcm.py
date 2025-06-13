#backend/api/rcm.py - Updated with Units as first step
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.rcm import RCMUnit, RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.models.user import User
from backend.models.machine import Machine
from backend.database import db
import os
from werkzeug.utils import secure_filename
from flask import current_app

rcm_bp = Blueprint('rcm', __name__)

# Get all RCM units
@rcm_bp.route('/units', methods=['GET'])
@jwt_required()
def get_units():
    # Optional filter by equipment
    equipment_id = request.args.get('equipment_id', type=int)
    
    query = RCMUnit.query
    
    if equipment_id:
        query = query.filter_by(equipment_id=equipment_id)
        
    units = query.all()
    
    result = []
    for unit in units:
        result.append({
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'equipment_id': unit.equipment_id,
            'technical_id': unit.technical_id,
            'function_count': len(unit.functions) if hasattr(unit, 'functions') else 0
        })
    
    return jsonify(units=result)

# Create new RCM unit
@rcm_bp.route('/units', methods=['POST'])
@jwt_required()
def create_unit():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create RCM data
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    unit = RCMUnit(
        name=data.get('name'),
        description=data.get('description'),
        equipment_id=data.get('equipment_id'),
        technical_id=data.get('technical_id', '')
    )
    
    db.session.add(unit)
    db.session.commit()
    
    return jsonify(message="Unit created successfully", id=unit.id), 201

# Get functions for a specific unit
@rcm_bp.route('/units/<int:unit_id>/functions', methods=['GET'])
@jwt_required()
def get_functions_for_unit(unit_id):
    unit = RCMUnit.query.get(unit_id)
    
    if not unit:
        return jsonify(message="Unit not found"), 404
    
    functions = RCMFunction.query.filter_by(unit_id=unit_id).all()
    
    result = []
    for function in functions:
        result.append({
            'id': function.id,
            'name': function.name,
            'description': function.description,
            'unit_id': function.unit_id,
            'equipment_id': function.equipment_id,
            'technical_id': function.technical_id,
            'failure_count': len(function.functional_failures) if hasattr(function, 'functional_failures') else 0
        })
    
    return jsonify(functions=result)

# Create new function for a unit
@rcm_bp.route('/units/<int:unit_id>/functions', methods=['POST'])
@jwt_required()
def create_function_for_unit(unit_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create RCM data
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    unit = RCMUnit.query.get(unit_id)
    if not unit:
        return jsonify(message="Unit not found"), 404
    
    data = request.get_json()
    
    function = RCMFunction(
        name=data.get('name'),
        description=data.get('description'),
        unit_id=unit_id,
        equipment_id=unit.equipment_id,
        technical_id=data.get('technical_id', '')
    )
    
    db.session.add(function)
    db.session.commit()
    
    return jsonify(message="Function created successfully", id=function.id), 201

# Get complete RCM analysis
@rcm_bp.route('/analysis', methods=['GET'])
@jwt_required()
def get_rcm_analysis():
    """Get complete RCM analysis"""
    # Optional filter by equipment
    equipment_id = request.args.get('equipment_id', type=int)
    
    query = RCMUnit.query
    
    if equipment_id:
        query = query.filter_by(equipment_id=equipment_id)
        
    units = query.all()
    
    # Get equipment name if ID is provided
    equipment_name = None
    if equipment_id:
        machine = Machine.query.get(equipment_id)
        if machine:
            equipment_name = machine.name
    
    result = []
    
    for unit in units:
        unit_data = {
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'equipment_id': unit.equipment_id,
            'equipment_name': equipment_name,
            'technical_id': unit.technical_id,
            'functions': []
        }
        
        for function in unit.functions:
            function_data = {
                'id': function.id,
                'name': function.name,
                'description': function.description,
                'technical_id': function.technical_id,
                'unit_id': function.unit_id,
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
                            'severity': effect.severity,
                            'safety_impact': effect.safety_impact,
                            'environmental_impact': effect.environmental_impact, 
                            'operational_impact': effect.operational_impact,
                            'economic_impact': effect.economic_impact
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
                            'interval_hours': action.interval_hours,
                            'maintenance_strategy': action.maintenance_strategy
                        }
                        mode_data['maintenance_actions'].append(action_data)
                    
                    failure_data['failure_modes'].append(mode_data)
                
                function_data['functional_failures'].append(failure_data)
            
            unit_data['functions'].append(function_data)
        
        result.append(unit_data)
    
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
        # Process units and their nested data
        for unit_data in data.get('units', []):
            unit = RCMUnit(
                name=unit_data.get('name'),
                description=unit_data.get('description'),
                equipment_id=unit_data.get('equipment_id'),
                technical_id=unit_data.get('technical_id', '')
            )
            db.session.add(unit)
            db.session.flush()  # Get ID without committing
            
            # Process functions for this unit
            for function_data in unit_data.get('functions', []):
                function = RCMFunction(
                    name=function_data.get('name'),
                    description=function_data.get('description'),
                    equipment_id=unit_data.get('equipment_id'),
                    unit_id=unit.id,
                    technical_id=function_data.get('technical_id', '')
                )
                db.session.add(function)
                db.session.flush()
                
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
                                failure_mode_id=mode.id,
                                safety_impact=effect_data.get('safety_impact'),
                                environmental_impact=effect_data.get('environmental_impact'),
                                operational_impact=effect_data.get('operational_impact'),
                                economic_impact=effect_data.get('economic_impact')
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
                                failure_mode_id=mode.id,
                                maintenance_strategy=action_data.get('maintenance_strategy')
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
        # First check if there's any RCM data
        units = RCMUnit.query.filter_by(equipment_id=equipment_id).count()
        if units == 0:
            return jsonify(
                message="No RCM analysis found for this equipment. Please import RCM data first.",
                work_orders=[]
            ), 400
        
        # Check if there are any maintenance actions
        maintenance_count = db.session.query(RCMMaintenance)\
            .join(RCMFailureMode)\
            .join(RCMFunctionalFailure)\
            .join(RCMFunction)\
            .join(RCMUnit)\
            .filter(RCMUnit.equipment_id == equipment_id)\
            .count()
            
        if maintenance_count == 0:
            return jsonify(
                message="No maintenance actions found in the RCM analysis.",
                work_orders=[]
            ), 400
        
        from backend.services.work_order_generator import WorkOrderGenerator
        
        # Generate work orders based on RCM maintenance actions
        work_orders = WorkOrderGenerator.generate_from_rcm(equipment_id)
        
        return jsonify(
            message=f"Generated {len(work_orders)} work orders from RCM analysis",
            work_orders=[{
                'id': wo.id,
                'title': wo.title,
                'description': wo.description,
                'due_date': wo.due_date.isoformat(),
                'priority': wo.priority,
                'type': wo.type
            } for wo in work_orders]
        )
    
    except Exception as e:
        logger.error(f"Error generating work orders: {str(e)}", exc_info=True)
        return jsonify(message=f"Failed to generate work orders: {str(e)}"), 500

@rcm_bp.route('/debug/<int:equipment_id>', methods=['GET'])
@jwt_required()
def debug_rcm_data(equipment_id):
    """Debug endpoint to see what RCM data exists"""
    
    # Get all RCM data for this equipment
    units = RCMUnit.query.filter_by(equipment_id=equipment_id).all()
    
    debug_info = {
        'equipment_id': equipment_id,
        'units': [],
        'all_functions': [],
        'all_maintenance_actions': []
    }
    
    # Get all units
    for unit in units:
        unit_info = {
            'id': unit.id,
            'name': unit.name,
            'technical_id': unit.technical_id,
            'functions': []
        }
        
        # Get functions for this unit
        functions = RCMFunction.query.filter_by(unit_id=unit.id).all()
        for func in functions:
            func_info = {
                'id': func.id,
                'name': func.name,
                'component_id': func.component_id,
                'unit_id': func.unit_id,
                'failures': []
            }
            
            # Get failures for this function
            failures = RCMFunctionalFailure.query.filter_by(function_id=func.id).all()
            for failure in failures:
                failure_info = {
                    'id': failure.id,
                    'name': failure.name,
                    'modes': []
                }
                
                # Get modes for this failure
                modes = RCMFailureMode.query.filter_by(functional_failure_id=failure.id).all()
                for mode in modes:
                    mode_info = {
                        'id': mode.id,
                        'name': mode.name,
                        'maintenance_actions': []
                    }
                    
                    # Get maintenance actions
                    actions = RCMMaintenance.query.filter_by(failure_mode_id=mode.id).all()
                    for action in actions:
                        mode_info['maintenance_actions'].append({
                            'id': action.id,
                            'title': action.title,
                            'interval_hours': action.interval_hours,
                            'interval_days': action.interval_days
                        })
                    
                    failure_info['modes'].append(mode_info)
                
                func_info['failures'].append(failure_info)
            
            unit_info['functions'].append(func_info)
        
        debug_info['units'].append(unit_info)
    
    # Also get all functions directly
    all_functions = RCMFunction.query.filter_by(equipment_id=equipment_id).all()
    for func in all_functions:
        debug_info['all_functions'].append({
            'id': func.id,
            'name': func.name,
            'unit_id': func.unit_id,
            'component_id': func.component_id
        })
    
    # Get all maintenance actions
    all_maintenance = db.session.query(RCMMaintenance)\
        .join(RCMFailureMode)\
        .join(RCMFunctionalFailure)\
        .join(RCMFunction)\
        .filter(RCMFunction.equipment_id == equipment_id)\
        .all()
    
    for maint in all_maintenance:
        debug_info['all_maintenance_actions'].append({
            'id': maint.id,
            'title': maint.title,
            'interval_hours': maint.interval_hours,
            'interval_days': maint.interval_days
        })
    
    return jsonify(debug_info)
@rcm_bp.route('/debug-detailed/<int:equipment_id>', methods=['GET'])
@jwt_required()
def debug_rcm_detailed(equipment_id):
    """Detailed debug of RCM data"""
    
    # Get raw counts
    unit_count = RCMUnit.query.filter_by(equipment_id=equipment_id).count()
    
    # Get all functions for this equipment (both through units and direct)
    functions_via_units = db.session.query(RCMFunction)\
        .join(RCMUnit, RCMFunction.unit_id == RCMUnit.id)\
        .filter(RCMUnit.equipment_id == equipment_id)\
        .count()
    
    functions_direct = RCMFunction.query.filter_by(equipment_id=equipment_id).count()
    
    # Get all data with details
    units = RCMUnit.query.filter_by(equipment_id=equipment_id).all()
    
    debug_data = {
        'summary': {
            'equipment_id': equipment_id,
            'unit_count': unit_count,
            'functions_via_units': functions_via_units,
            'functions_direct': functions_direct,
            'total_functions': RCMFunction.query.count(),
            'total_units': RCMUnit.query.count()
        },
        'units_detail': []
    }
    
    for unit in units:
        unit_data = {
            'id': unit.id,
            'name': unit.name,
            'technical_id': unit.technical_id,
            'equipment_id': unit.equipment_id,
            'function_count': RCMFunction.query.filter_by(unit_id=unit.id).count(),
            'functions': []
        }
        
        # Get functions for this unit
        functions = RCMFunction.query.filter_by(unit_id=unit.id).all()
        for func in functions:
            unit_data['functions'].append({
                'id': func.id,
                'name': func.name,
                'equipment_id': func.equipment_id,
                'unit_id': func.unit_id,
                'component_id': func.component_id
            })
        
        debug_data['units_detail'].append(unit_data)
    
    # Also check for orphaned functions
    orphaned_functions = RCMFunction.query.filter_by(equipment_id=equipment_id, unit_id=None).all()
    debug_data['orphaned_functions'] = [{
        'id': f.id,
        'name': f.name,
        'equipment_id': f.equipment_id
    } for f in orphaned_functions]
    
    return jsonify(debug_data)
# Add file upload endpoint
@rcm_bp.route('/upload-excel', methods=['POST'])
@jwt_required()
def upload_excel():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can import RCM data
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    if 'file' not in request.files:
        return jsonify(message="No file part"), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify(message="No selected file"), 400
        
    equipment_id = request.form.get('equipment_id')
    if not equipment_id:
        return jsonify(message="Equipment ID is required"), 400
    
    try:
        equipment_id = int(equipment_id)
    except ValueError:
        return jsonify(message="Invalid equipment ID"), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            from backend.services.import_service import RCMImportService
            
            result = RCMImportService.import_from_excel(file_path, equipment_id)
            
            # Optionally delete the file after import
            os.remove(file_path)
            
            # If import was not successful, return the error message
            if not result.get('success', False):
                return jsonify(message=result.get('message', 'Import failed')), 400
                
            return jsonify(
                message="Excel file imported successfully",
                imported=result.get('imported', {})
            ), 201
            
        except Exception as e:
            # Clean up file in case of error
            if os.path.exists(file_path):
                os.remove(file_path)
                
            logger.error(f"Error importing RCM file: {str(e)}", exc_info=True)
            return jsonify(message=f"Error importing file: {str(e)}"), 500
    
    return jsonify(message="Invalid file format"), 400

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'xlsx', 'xls'}
@rcm_bp.route('/test-create/<int:equipment_id>', methods=['POST'])
@jwt_required()
def test_create_rcm(equipment_id):
    """Test endpoint to create sample RCM data"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    try:
        # Create a test unit
        unit = RCMUnit(
            name="Test Unit",
            description="Test unit for debugging",
            equipment_id=equipment_id,
            technical_id="TEST.01"
        )
        db.session.add(unit)
        db.session.flush()
        
        # Create a test function
        function = RCMFunction(
            name="Test Function",
            description="Test function for debugging",
            equipment_id=equipment_id,
            unit_id=unit.id,
            technical_id="TEST.01"
        )
        db.session.add(function)
        db.session.flush()
        
        # Create a test failure
        failure = RCMFunctionalFailure(
            name="Test Failure",
            description="Test failure",
            function_id=function.id
        )
        db.session.add(failure)
        db.session.flush()
        
        # Create a test mode
        mode = RCMFailureMode(
            name="Test Mode",
            description="Test mode",
            failure_type="Test",
            detection_method="Visual",
            functional_failure_id=failure.id
        )
        db.session.add(mode)
        db.session.flush()
        
        # Create a test maintenance action
        maintenance = RCMMaintenance(
            title="Test Maintenance",
            description="Test maintenance action",
            maintenance_type="preventive",
            interval_days=30,
            failure_mode_id=mode.id
        )
        db.session.add(maintenance)
        
        db.session.commit()
        
        return jsonify({
            "message": "Test RCM data created successfully",
            "unit_id": unit.id,
            "function_id": function.id,
            "maintenance_id": maintenance.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Error creating test data: {str(e)}"), 500