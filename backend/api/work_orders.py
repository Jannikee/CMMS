"""
Work order routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.work_order import WorkOrder
from backend.models.machine import Machine, Component
from backend.models.user import User
from backend.database import db
from datetime import datetime, timedelta

work_orders_bp = Blueprint('work_orders', __name__)

@work_orders_bp.route('/test', methods=['GET'])
def test_endpoint():
    return jsonify({"message": "This is a test endpoint that works without authentication"}), 200

@work_orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_work_orders():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Filter parameters
    status = request.args.get('status')
    machine_id = request.args.get('machine_id')
    
    query = WorkOrder.query
    
    if status:
        query = query.filter(WorkOrder.status == status)
    if machine_id:
        query = query.filter(WorkOrder.machine_id == machine_id)
    
    # If user is a worker, only show assigned work orders... no need
    if user.role == 'worker':
        query = query.filter(WorkOrder.assigned_to == current_user_id)
    
    work_orders = query.all()
    
    result = []
    for wo in work_orders:
        machine = Machine.query.get(wo.machine_id)
        component = Component.query.get(wo.component_id) if wo.component_id else None
        assigned_user = User.query.get(wo.assigned_to) if wo.assigned_to else None          #Might not be needed
        
        result.append({
            'id': wo.id,
            'title': wo.title,
            'description': wo.description,
            'status': wo.status,
            'priority': wo.priority,
            'type': wo.type,
            'category': wo.category,
            'created_at': wo.created_at.isoformat(),
            'due_date': wo.due_date.isoformat(),
            'machine': machine.name,
            'component': component.name if component else None,
            'assigned_to': assigned_user.username if assigned_user else None,               # might not be needed
            'tool_requirements': wo.tool_requirements,
            'reason': wo.reason
        })
    
    return jsonify(work_orders=result)

@work_orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_work_order():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can create work orders                        unsure if needed
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    machine = Machine.query.get(data.get('machine_id'))
    if not machine:
        return jsonify(message="Machine not found"), 404
    
    component = None
    if data.get('component_id'):
        component = Component.query.get(data.get('component_id'))
        if not component:
            return jsonify(message="Component not found"), 404
    
    assigned_user = None
    if data.get('assigned_to'):
        assigned_user = User.query.filter_by(username=data.get('assigned_to')).first()
        if not assigned_user:
            return jsonify(message="Assigned user not found"), 404
    
    work_order = WorkOrder(
        title=data.get('title'),
        description=data.get('description'),
        due_date=datetime.fromisoformat(data.get('due_date')),
        status='open',
        priority=data.get('priority', 'normal'),
        type=data.get('type'),
        category=data.get('category'),
        machine_id=machine.id,
        component_id=component.id if component else None,
        assigned_to=assigned_user.id if assigned_user else None,
        tool_requirements=data.get('tool_requirements'),
        reason=data.get('reason'),
        generation_source=data.get('generation_source', 'manual')
    )
    
    db.session.add(work_order)
    db.session.commit()
    
    return jsonify(message="Work order created successfully", id=work_order.id), 201

@work_orders_bp.route('/<int:work_order_id>', methods=['PUT'])
@jwt_required()
def update_work_order(work_order_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return jsonify(message="Work order not found"), 404
    
    # Workers can only update status
    if user.role == 'worker' and user.id != work_order.assigned_to:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    
    # Workers can only update status
    if user.role == 'worker':
        if 'status' in data:
            work_order.status = data.get('status')
    else:  # Supervisors and admins can update everything
        if 'title' in data:
            work_order.title = data.get('title')
        if 'description' in data:
            work_order.description = data.get('description')
        if 'due_date' in data:
            work_order.due_date = datetime.fromisoformat(data.get('due_date'))
        if 'status' in data:
            work_order.status = data.get('status')
        if 'priority' in data:
            work_order.priority = data.get('priority')
        if 'category' in data:
            work_order.category = data.get('category')
        if 'assigned_to' in data:
            assigned_user = User.query.filter_by(username=data.get('assigned_to')).first()
            work_order.assigned_to = assigned_user.id if assigned_user else None
    
    db.session.commit()
    
    return jsonify(message="Work order updated successfully"), 200