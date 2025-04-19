"""
Reporting routes
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import User
from backend.services.statistics import MaintenanceStatistics
from backend.services.reporting import ReportGenerator
from datetime import datetime, timedelta
import json

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/failure-rates', methods=['GET'])
@jwt_required()
def get_failure_rates():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can access reports
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    # Get filter parameters
    machine_id = request.args.get('machine_id', type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else None
    
    failure_rates = MaintenanceStatistics.get_failure_rates(machine_id, start_date, end_date)
    
    return jsonify(failure_rates=failure_rates)

@reports_bp.route('/uptime', methods=['GET'])
@jwt_required()
def get_uptime_statistics():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can access reports
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    # Get filter parameters
    machine_id = request.args.get('machine_id', type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else None
    
    uptime_stats = MaintenanceStatistics.get_uptime_statistics(machine_id, start_date, end_date)
    
    return jsonify(uptime_statistics=uptime_stats)

@reports_bp.route('/mtbf-mttr', methods=['GET'])
@jwt_required()
def get_mtbf_mttr():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can access reports
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    # Get filter parameters
    machine_id = request.args.get('machine_id', type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else None
    
    mtbf_mttr = MaintenanceStatistics.get_mtbf_mttr(machine_id, start_date, end_date)
    
    return jsonify(mtbf_mttr_statistics=mtbf_mttr)

@reports_bp.route('/work-orders', methods=['GET'])
@jwt_required()
def get_work_order_statistics():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can access reports
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    # Get filter parameters
    machine_id = request.args.get('machine_id', type=int)
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else None
    
    work_order_stats = MaintenanceStatistics.get_work_order_statistics(machine_id, start_date, end_date)
    
    return jsonify(work_order_statistics=work_order_stats)

@reports_bp.route('/generate-pdf', methods=['POST'])
@jwt_required()
def generate_pdf_report():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can generate reports
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    data = request.get_json()
    report_type = data.get('report_type')
    machine_id = data.get('machine_id')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    
    # Parse dates if provided
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else None
    
    # Generate PDF report
    report_file = ReportGenerator.generate_pdf_report(
        report_type,
        machine_id,
        start_date,
        end_date,
        user.username
    )
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{report_type}_report_{timestamp}.pdf"
    
    return send_file(
        report_file,
        mimetype='application/pdf',
        download_name=filename,
        as_attachment=True
    )

@reports_bp.route('/dashboard-summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    # Only supervisors and admins can access dashboard summary
    if user.role not in ['supervisor', 'admin']:
        return jsonify(message="Unauthorized"), 403
    
    # Get summary statistics for dashboard
    # Last 30 days by default
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Get work order counts by status
    work_order_stats = MaintenanceStatistics.get_work_order_statistics(None, start_date, end_date)
    
    # Calculate totals
    total_work_orders = sum(stat['total_work_orders'] for stat in work_order_stats)
    open_work_orders = sum(stat['by_status'].get('open', 0) for stat in work_order_stats)
    in_progress_work_orders = sum(stat['by_status'].get('in_progress', 0) for stat in work_order_stats)
    completed_work_orders = sum(stat['by_status'].get('completed', 0) for stat in work_order_stats)
    
    # Get failure counts
    failure_rates = MaintenanceStatistics.get_failure_rates(None, start_date, end_date)
    total_failures = sum(rate['failure_count'] for rate in failure_rates)
    
    # Get uptime statistics
    uptime_stats = MaintenanceStatistics.get_uptime_statistics(None, start_date, end_date)
    avg_uptime_percentage = sum(stat['uptime_percentage'] for stat in uptime_stats) / len(uptime_stats) if uptime_stats else 0
    
    dashboard_summary = {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'days': 30
        },
        'work_orders': {
            'total': total_work_orders,
            'open': open_work_orders,
            'in_progress': in_progress_work_orders,
            'completed': completed_work_orders
        },
        'failures': {
            'total': total_failures
        },
        'uptime': {
            'average_percentage': round(avg_uptime_percentage, 2)
        }
    }
    
    return jsonify(dashboard_summary=dashboard_summary)