"""
Statistical analysis functions
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from backend.models.maintenance_log import MaintenanceLog
from backend.models.work_order import WorkOrder
from backend.models.failure import Failure
from backend.models.machine import Machine,Subsystem, Component
from sqlalchemy import func
from backend.database import db

class MaintenanceStatistics:
    @staticmethod
    def get_failure_rates(machine_id=None, subsystem_id=None, component_id=None, start_date=None, end_date=None):
        """
        Calculating failure rates for machines, subsystems, or components
        depending on the ID 
        """
        # Determine the level we're analyzing
        if component_id:
            # Component-level analysis
            base_query = db.session.query(
                Component.id,
                Component.name,
                Component.technical_id,
                Subsystem.name.label('subsystem_name'),
                Machine.name.label('machine_name'),
                func.count(Failure.id).label('failure_count')
            ).join(
                MaintenanceLog, MaintenanceLog.component_id == Component.id
            ).join(
                Subsystem, Component.subsystem_id == Subsystem.id
            ).join(
                Machine, Component.machine_id == Machine.id
            ).join(
                Failure, Failure.maintenance_log_id == MaintenanceLog.id
            ).filter(Component.id == component_id)
            
            group_by = Component.id
            
        elif subsystem_id:
            # Subsystem-level analysis
            base_query = db.session.query(
                Subsystem.id,
                Subsystem.name,
                Subsystem.technical_id,
                Machine.name.label('machine_name'),
                func.count(Failure.id).label('failure_count')
            ).join(
                MaintenanceLog, MaintenanceLog.subsystem_id == Subsystem.id
            ).join(
                Machine, Subsystem.machine_id == Machine.id
            ).join(
                Failure, Failure.maintenance_log_id == MaintenanceLog.id
            ).filter(Subsystem.id == subsystem_id)
            
            group_by = Subsystem.id
            
        else:
            # Machine-level analysis
            base_query = db.session.query(
                Machine.id,
                Machine.name,
                Machine.technical_id,
                func.count(Failure.id).label('failure_count')
            ).join(
                MaintenanceLog, MaintenanceLog.machine_id == Machine.id
            ).join(
                Failure, Failure.maintenance_log_id == MaintenanceLog.id
            )
            
            group_by = Machine.id
            if machine_id:
                base_query = base_query.filter(Machine.id == machine_id)
        
        # Common filters for all levels
        if start_date:
            base_query = base_query.filter(MaintenanceLog.timestamp >= start_date)
        if end_date:
            base_query = base_query.filter(MaintenanceLog.timestamp <= end_date)
        
        # Group by the appropriate level
        results = base_query.group_by(group_by).all()
        
        # Process and format the results
        failure_rates = []
    
        for result in results:
            if component_id:
                # Component-level results
                component_id, component_name, technical_id, subsystem_name, machine_name, failure_count = result
                
                # Get the operating hours and machine settings
                machine = Machine.query.get(Component.query.get(component_id).machine_id)
                total_hours = machine.hour_counter if machine.hour_counter else 0
                denominator = machine.failure_rate_denominator  # Get machine-specific setting
                
            elif subsystem_id:
                # Subsystem-level results
                subsystem_id, subsystem_name, technical_id, machine_name, failure_count = result
                
                # Get the operating hours and machine settings
                machine = Machine.query.get(Subsystem.query.get(subsystem_id).machine_id)
                total_hours = machine.hour_counter if machine.hour_counter else 0
                denominator = machine.failure_rate_denominator  # Get machine-specific setting
                
            else:
                # Machine-level results
                machine_id, machine_name, technical_id, failure_count = result
                
                # Get the operating hours and machine settings
                machine = Machine.query.get(machine_id)
                total_hours = machine.hour_counter if machine.hour_counter else 0
                denominator = machine.failure_rate_denominator  # Get machine-specific setting
            
            # Calculate failure rate using the machine-specific denominator
            failure_rate = round((failure_count / total_hours * denominator) if total_hours > 0 else 0, 2)
            
            # Add to results with appropriate information
            result_dict = {
                'level': 'component' if component_id else 'subsystem' if subsystem_id else 'machine',
                'id': component_id or subsystem_id or machine_id,
                'name': component_name or subsystem_name or machine_name,
                'technical_id': technical_id,
                'failure_count': failure_count,
                'operation_hours': total_hours,
                'failure_rate_per_x_hours': failure_rate,
                'denominator': denominator,
                'rate_description': f"{failure_rate} failures per {denominator} hours"
            }
            
            # Add additional fields based on level
            if component_id:
                result_dict['subsystem_name'] = subsystem_name
                result_dict['machine_name'] = machine_name
            elif subsystem_id:
                result_dict['machine_name'] = machine_name
                
            failure_rates.append(result_dict)
    
        return failure_rates
    @staticmethod
    def get_uptime_statistics(machine_id=None, start_date=None, end_date=None):
        """Calculate uptime statistics for machines"""
        # Query completed work orders that caused downtime
        query = db.session.query(
            WorkOrder.machine_id,
            func.sum(WorkOrder.downtime_hours).label('total_downtime')
        ).filter(
            WorkOrder.status == 'completed'
        ).group_by(
            WorkOrder.machine_id
        )
        
        if machine_id:
            query = query.filter(WorkOrder.machine_id == machine_id)
            
        if start_date:
            query = query.filter(WorkOrder.created_at >= start_date)
            
        if end_date:
            query = query.filter(WorkOrder.created_at <= end_date)
            
        # Note: This assumes we have a 'downtime_hours' field in WorkOrder model
        # You would need to add this field or use a different approach
        
        results = query.all()
        
        # Calculate time period for uptime calculation
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=30)  # Default to last 30 days
            
        if not end_date:
            end_date = datetime.now(timezone.utc)
            
        total_hours = (end_date - start_date).total_seconds() / 3600
        
        uptime_stats = []
        for result in results:
            machine_id, total_downtime = result
            
            # Get machine
            machine = Machine.query.get(machine_id)
            
            if total_downtime is None:
                total_downtime = 0
                
            uptime_hours = total_hours - total_downtime
            uptime_percentage = (uptime_hours / total_hours * 100) if total_hours > 0 else 0
            
            uptime_stats.append({
                'machine_id': machine_id,
                'machine_name': machine.name,
                'period_hours': round(total_hours, 1),
                'downtime_hours': round(total_downtime, 1),
                'uptime_hours': round(uptime_hours, 1),
                'uptime_percentage': round(uptime_percentage, 2)
            })
        
        return uptime_stats
    
    @staticmethod
    def get_mtbf_mttr(machine_id=None, start_date=None, end_date=None):
        """Calculate Mean Time Between Failures (MTBF) and Mean Time To Repair (MTTR)"""
        # Query failures
        failures_query = db.session.query(
            MaintenanceLog.machine_id,
            MaintenanceLog.timestamp,
            WorkOrder.downtime_hours
        ).join(
            Failure, Failure.maintenance_log_id == MaintenanceLog.id
        ).join(
            WorkOrder, WorkOrder.id == MaintenanceLog.work_order_id
        ).filter(
            WorkOrder.status == 'completed'
        ).order_by(
            MaintenanceLog.machine_id,
            MaintenanceLog.timestamp
        )
        
        if machine_id:
            failures_query = failures_query.filter(MaintenanceLog.machine_id == machine_id)
            
        if start_date:
            failures_query = failures_query.filter(MaintenanceLog.timestamp >= start_date)
            
        if end_date:
            failures_query = failures_query.filter(MaintenanceLog.timestamp <= end_date)
            
        failures = failures_query.all()
        
        # Group failures by machine
        failures_by_machine = {}
        for failure in failures:
            machine_id, timestamp, downtime = failure
            
            if machine_id not in failures_by_machine:
                failures_by_machine[machine_id] = []
                
            failures_by_machine[machine_id].append({
                'timestamp': timestamp,
                'downtime': downtime if downtime else 0
            })
        
        # Calculate MTBF and MTTR for each machine
        mtbf_mttr_stats = []
        for machine_id, machine_failures in failures_by_machine.items():
            machine = Machine.query.get(machine_id)
            
            if len(machine_failures) < 2:
                continue  # Need at least 2 failures to calculate MTBF
                
            # Calculate time between failures
            time_between_failures = []
            for i in range(1, len(machine_failures)):
                prev_failure = machine_failures[i-1]
                curr_failure = machine_failures[i]
                
                hours_between = (curr_failure['timestamp'] - prev_failure['timestamp']).total_seconds() / 3600
                time_between_failures.append(hours_between)
            
            # Calculate MTBF
            mtbf = sum(time_between_failures) / len(time_between_failures) if time_between_failures else 0
            
            # Calculate MTTR
            repair_times = [failure['downtime'] for failure in machine_failures if failure['downtime']]
            mttr = sum(repair_times) / len(repair_times) if repair_times else 0
            
            mtbf_mttr_stats.append({
                'machine_id': machine_id,
                'machine_name': machine.name,
                'failure_count': len(machine_failures),
                'mtbf_hours': round(mtbf, 2),
                'mttr_hours': round(mttr, 2)
            })
        
        return mtbf_mttr_stats
    
    @staticmethod
    def generate_work_order_statistics(machine_id=None, start_date=None, end_date=None):
        """Generate statistics about work orders"""
        # Query work orders
        query = db.session.query(
            WorkOrder.machine_id,
            WorkOrder.type,
            WorkOrder.status,
            func.count(WorkOrder.id).label('count')
        ).group_by(
            WorkOrder.machine_id,
            WorkOrder.type,
            WorkOrder.status
        )
        
        if machine_id:
            query = query.filter(WorkOrder.machine_id == machine_id)
            
        if start_date:
            query = query.filter(WorkOrder.created_at >= start_date)
            
        if end_date:
            query = query.filter(WorkOrder.created_at <= end_date)
            
        results = query.all()
        
        # Organize results by machine
        stats_by_machine = {}
        for result in results:
            machine_id, wo_type, status, count = result
            
            if machine_id not in stats_by_machine:
                stats_by_machine[machine_id] = {
                    'machine_id': machine_id,
                    'machine_name': Machine.query.get(machine_id).name,
                    'total_work_orders': 0,
                    'by_type': {
                        'preventive': 0,
                        'predictive': 0,
                        'corrective': 0
                    },
                    'by_status': {
                        'open': 0,
                        'in_progress': 0,
                        'completed': 0
                    }
                }
            
            # Update counts
            stats_by_machine[machine_id]['total_work_orders'] += count
            
            if wo_type in stats_by_machine[machine_id]['by_type']:
                stats_by_machine[machine_id]['by_type'][wo_type] += count
            
            if status in stats_by_machine[machine_id]['by_status']:
                stats_by_machine[machine_id]['by_status'][status] += count
        
        return list(stats_by_machine.values())