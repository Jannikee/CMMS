"""
API endpoints for maintenance automation
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.models.machine import Component
from backend.models.maintenance_settings import OptimizationResult, MaintenanceSettings, IntervalAdjustmentHistory
from backend.services.interval_optimization import IntervalOptimizationService
from backend.services.interval_adjustment import IntervalAdjustmentService
from backend.services.automation_controller import AutomationController
from backend.services.scheduler import maintenance_scheduler
from backend.database import db
import json
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

automation_bp = Blueprint('automation', __name__)

@automation_bp.route('/analyze-component/<int:component_id>', methods=['POST'])
@jwt_required()
def analyze_component(component_id):
    """Analyze a specific component for maintenance interval optimization"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Check if user has permission
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Check if component exists
    component = Component.query.get(component_id)
    if not component:
        return jsonify(message="Component not found"), 404
    
    # Get analysis parameters
    data = request.get_json() or {}
    look_back_days = data.get('look_back_days', 180)
    use_kaplan_meier = data.get('use_kaplan_meier', False)
    
    # Run the analysis
    recommendation = IntervalOptimizationService.analyze_component_maintenance(
        component_id, 
        look_back_days=look_back_days,
        use_kaplan_meier=use_kaplan_meier
    )
    
    if not recommendation:
        return jsonify(message="Unable to analyze component"), 400
    
    return jsonify({
        "component_id": component_id,
        "component_name": component.name,
        "analysis_id": recommendation.get("analysis_id"),
        "analysis_method": "kaplan_meier" if use_kaplan_meier else "weibull",
        "recommendation": recommendation
    })

@automation_bp.route('/apply-optimization/<int:analysis_id>', methods=['POST'])
@jwt_required()
def apply_optimization(analysis_id):
    """Apply optimization results to maintenance schedules"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Check if user has permission
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Get the optimization result
    optimization = OptimizationResult.query.get(analysis_id)
    if not optimization:
        return jsonify(message="Analysis not found"), 404
    
    # Check if already applied
    if optimization.applied:
        return jsonify(message="This optimization has already been applied"), 400
    
    # Get the recommendation details
    recommendation = json.loads(optimization.recommendation_details)
    
    # Apply the changes
    adjustment_result = IntervalAdjustmentService.apply_optimization_results(
        recommendation, 
        user_id=current_user_id
    )
    
    # Update optimization record
    optimization.applied = True
    optimization.applied_timestamp = datetime.now(timezone.utc)
    optimization.applied_by = current_user_id
    db.session.commit()
    
    return jsonify({
        "message": "Optimization applied successfully",
        "analysis_id": analysis_id,
        "adjustments": adjustment_result
    })

@automation_bp.route('/adjustment-history/<int:component_id>', methods=['GET'])
@jwt_required()
def get_adjustment_history(component_id):
    """Get the history of interval adjustments for a component"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Check if user has permission
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Get component
    component = Component.query.get(component_id)
    if not component:
        return jsonify(message="Component not found"), 404
    
    # Fetch adjustments related to this component's maintenance actions
    from backend.models.rcm import RCMFailureMode, RCMFunctionalFailure, RCMFunction
    
    # First find RCM functions for this component
    functions = RCMFunction.query.filter_by(component_id=component_id).all()
    
    if not functions:
        return jsonify(adjustments=[])
    
    # Get all functional failures for these functions
    function_ids = [f.id for f in functions]
    
    failures = RCMFunctionalFailure.query.filter(
        RCMFunctionalFailure.function_id.in_(function_ids)
    ).all()
    
    if not failures:
        return jsonify(adjustments=[])
    
    # Get all failure modes for these failures
    failure_ids = [f.id for f in failures]
    
    modes = RCMFailureMode.query.filter(
        RCMFailureMode.functional_failure_id.in_(failure_ids)
    ).all()
    
    if not modes:
        return jsonify(adjustments=[])
    
    # Get maintenance actions for these modes
    mode_ids = [m.id for m in modes]
    
    maintenance_ids = db.session.query(RCMMaintenance.id).filter(
        RCMMaintenance.failure_mode_id.in_(mode_ids)
    ).all()
    
    if not maintenance_ids:
        return jsonify(adjustments=[])
    
    maintenance_ids = [m[0] for m in maintenance_ids]
    
    # Get adjustments for these maintenance actions
    adjustments = IntervalAdjustmentHistory.query.filter(
        IntervalAdjustmentHistory.maintenance_id.in_(maintenance_ids)
    ).order_by(IntervalAdjustmentHistory.timestamp.desc()).all()
    
    # Filter out adjustments that are not for this component
    # This is a double-check as the query above should already filter correctly
    filtered_adjustments = []
    for adj in adjustments:
        try:
            maintenance = RCMMaintenance.query.get(adj.maintenance_id)
            if not maintenance:
                continue
                
            failure_mode = RCMFailureMode.query.get(maintenance.failure_mode_id)
            if not failure_mode:
                continue
                
            functional_failure = RCMFunctionalFailure.query.get(failure_mode.functional_failure_id)
            if not functional_failure:
                continue
                
            function = RCMFunction.query.get(functional_failure.function_id)
            if not function:
                continue
                
            # Check if this function belongs to the specified component
            if function.component_id == component_id:
                filtered_adjustments.append(adj)
        except Exception as e:
            logger.error(f"Error tracing relationship for adjustment {adj.id}: {str(e)}")
            
    adjustments = filtered_adjustments
    
    # Format results
    results = []
    for adj in adjustments:
        # Get maintenance action
        from backend.models.rcm import RCMMaintenance
        maintenance = RCMMaintenance.query.get(adj.maintenance_id)
        if not maintenance:
            continue
            
        # Get user name
        user_name = "Automated"
        if adj.user_id:
            user = User.query.get(adj.user_id)
            if user:
                user_name = user.username
        
        results.append({
            "id": adj.id,
            "timestamp": adj.timestamp.isoformat(),
            "maintenance_id": adj.maintenance_id,
            "maintenance_title": maintenance.title if maintenance else "Unknown",
            "old_interval_hours": adj.old_interval_hours,
            "old_interval_days": adj.old_interval_days,
            "new_interval_hours": adj.new_interval_hours,
            "new_interval_days": adj.new_interval_days,
            "reason": adj.reason,
            "automated": adj.automated,
            "user": user_name
        })
    
    return jsonify({
        "count": len(results),
        "adjustments": results
    })

@automation_bp.route('/settings/component/<int:component_id>', methods=['GET', 'POST'])
@jwt_required()
def component_settings(component_id):
    """Get or update maintenance settings for a component"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only admins and supervisors can view and change settings
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Check if component exists
    component = Component.query.get(component_id)
    if not component:
        return jsonify(message="Component not found"), 404
    
    if request.method == 'GET':
        # Get current settings
        settings = MaintenanceSettings.query.filter_by(component_id=component_id).first()
        
        if not settings:
            # Return default settings
            return jsonify({
                "component_id": component_id,
                "analysis_method": "weibull",
                "auto_adjust_enabled": False,
                "require_approval": True,
                "reliability_target": 0.9,
                "min_confidence": 0.7,
                "max_increase_percent": 25.0,
                "max_decrease_percent": 30.0,
                "min_interval_hours": None,
                "max_interval_hours": None,
                "min_interval_days": None,
                "max_interval_days": None
            })
        
        return jsonify({
            "component_id": settings.component_id,
            "analysis_method": settings.analysis_method,
            "auto_adjust_enabled": settings.auto_adjust_enabled,
            "require_approval": settings.require_approval,
            "reliability_target": settings.reliability_target,
            "min_confidence": settings.min_confidence,
            "max_increase_percent": settings.max_increase_percent,
            "max_decrease_percent": settings.max_decrease_percent,
            "min_interval_hours": settings.min_interval_hours,
            "max_interval_hours": settings.max_interval_hours,
            "min_interval_days": settings.min_interval_days,
            "max_interval_days": settings.max_interval_days,
            "last_updated": settings.last_updated.isoformat() if settings.last_updated else None
        })
    
    elif request.method == 'POST':
        # Update settings
        data = request.get_json()
        
        settings = MaintenanceSettings.query.filter_by(component_id=component_id).first()
        
        if not settings:
            # Create new settings
            settings = MaintenanceSettings(
                component_id=component_id,
                updated_by=current_user_id
            )
            db.session.add(settings)
        
        # Update fields
        if 'analysis_method' in data:
            settings.analysis_method = data['analysis_method']
        
        if 'auto_adjust_enabled' in data:
            settings.auto_adjust_enabled = data['auto_adjust_enabled']
        
        if 'require_approval' in data:
            settings.require_approval = data['require_approval']
        
        if 'reliability_target' in data:
            settings.reliability_target = data['reliability_target']
        
        if 'min_confidence' in data:
            settings.min_confidence = data['min_confidence']
        
        if 'max_increase_percent' in data:
            settings.max_increase_percent = data['max_increase_percent']
        
        if 'max_decrease_percent' in data:
            settings.max_decrease_percent = data['max_decrease_percent']
        
        if 'min_interval_hours' in data:
            settings.min_interval_hours = data['min_interval_hours']
        
        if 'max_interval_hours' in data:
            settings.max_interval_hours = data['max_interval_hours']
        
        if 'min_interval_days' in data:
            settings.min_interval_days = data['min_interval_days']
        
        if 'max_interval_days' in data:
            settings.max_interval_days = data['max_interval_days']
        
        settings.last_updated = datetime.now(timezone.utc)
        settings.updated_by = current_user_id
        
        db.session.commit()
        
        return jsonify({
            "message": "Settings updated successfully",
            "component_id": component_id
        })

@automation_bp.route('/generate-updated-work-orders', methods=['POST'])
@jwt_required()
def generate_updated_work_orders():
    """Generate new work orders based on updated maintenance intervals"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only admins and supervisors can generate work orders
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Generate work orders
    generated_orders = IntervalAdjustmentService.generate_updated_work_orders()
    
    return jsonify({
        "message": f"Generated {len(generated_orders)} work orders",
        "work_orders_generated": len(generated_orders),
        "work_order_ids": [wo.id for wo in generated_orders]
    })

@automation_bp.route('/validate-optimization-effectiveness', methods=['GET'])
@jwt_required()
def validate_optimization_effectiveness():
    """Analyze the effectiveness of previously applied optimizations"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only admins and supervisors can view effectiveness metrics
    if user.role not in ['admin', 'supervisor']:
        return jsonify(message="Not authorized"), 403
    
    # Get days parameter
    days = request.args.get('days', 90, type=int)
    
    # Validate the effectiveness of optimizations
    results = AutomationController.validate_optimization_effectiveness(days)
    
    return jsonify(results)

@automation_bp.route('/scheduler-status', methods=['GET'])
@jwt_required()
def get_scheduler_status():
    """Get the current status of the maintenance scheduler"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify(message="Not authorized"), 403
    
    is_running = maintenance_scheduler.running
    analysis_method = 'kaplan_meier' if maintenance_scheduler.use_kaplan_meier else 'weibull'
    
    latest_optimization = OptimizationResult.query.order_by(
        OptimizationResult.analysis_timestamp.desc()
    ).first()
    
    last_run = None
    if latest_optimization:
        last_run = {
            "timestamp": latest_optimization.analysis_timestamp.isoformat(),
            "components_analyzed": 1,
            "optimizations_needed": 1 if latest_optimization.needs_adjustment else 0,
            "optimizations_applied": 1 if latest_optimization.applied else 0,
            "results": []
        }
    
    return jsonify({
        "is_running": is_running,
        "analysis_method": analysis_method,
        "last_run": last_run
    })

@automation_bp.route('/scheduler/start', methods=['POST'])
@jwt_required()
def start_scheduler():
    """Start the maintenance scheduler"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify(message="Not authorized"), 403
    
    if maintenance_scheduler.running:
        return jsonify(success=False, message="Scheduler is already running")
    
    maintenance_scheduler.start()
    
    return jsonify(success=True, message="Scheduler started successfully")

@automation_bp.route('/scheduler/stop', methods=['POST'])
@jwt_required()
def stop_scheduler():
    """Stop the maintenance scheduler"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify(message="Not authorized"), 403
    
    if not maintenance_scheduler.running:
        return jsonify(success=False, message="Scheduler is not running")
    
    maintenance_scheduler.stop()
    
    return jsonify(success=True, message="Scheduler stopped successfully")