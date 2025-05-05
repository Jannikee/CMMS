# backend/services/export_service.py
import pandas as pd
import io
from datetime import datetime
from backend.models.work_order import WorkOrder
from backend.models.maintenance_log import MaintenanceLog
from backend.models.machine import Machine, Component
from backend.models.user import User
from backend.models.failure import Failure
from sqlalchemy import func
from backend.database import db

class ExportService:
    @staticmethod
    def export_work_orders(machine_id=None, start_date=None, end_date=None):
        """Export work orders to Excel"""
        # Build query
        query = db.session.query(
            WorkOrder,
            Machine.name.label('machine_name'),
            Component.name.label('component_name'),
            User.username.label('assigned_to')
        ).join(
            Machine, WorkOrder.machine_id == Machine.id
        ).outerjoin(
            Component, WorkOrder.component_id == Component.id
        ).outerjoin(
            User, WorkOrder.assigned_to == User.id
        )
        
        # Apply filters
        if machine_id:
            query = query.filter(WorkOrder.machine_id == machine_id)
        if start_date:
            query = query.filter(WorkOrder.created_at >= start_date)
        if end_date:
            query = query.filter(WorkOrder.created_at <= end_date)
            
        # Execute query
        results = query.all()
        
        # Convert to list of dictionaries
        data = []
        for row in results:
            work_order = row[0]
            data.append({
                'ID': work_order.id,
                'Title': work_order.title,
                'Description': work_order.description,
                'Machine': row.machine_name,
                'Component': row.component_name,
                'Status': work_order.status,
                'Priority': work_order.priority,
                'Type': work_order.type,
                'Category': work_order.category,
                'Assigned To': row.assigned_to,
                'Created Date': work_order.created_at.strftime('%Y-%m-%d %H:%M'),
                'Due Date': work_order.due_date.strftime('%Y-%m-%d %H:%M'),
                'Reason': work_order.reason,
                'Source': work_order.generation_source
            })
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Write to Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Work Orders', index=False)
            worksheet = writer.sheets['Work Orders']
            
            # Format the worksheet
            for i, col in enumerate(df.columns):
                # Set column width based on content
                max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, max_len)
        
        output.seek(0)
        return output
    
    @staticmethod
    def export_maintenance_logs(machine_id=None, start_date=None, end_date=None):
        """Export maintenance logs to Excel"""
        # Build query
        query = db.session.query(
            MaintenanceLog,
            Machine.name.label('machine_name'),
            Component.name.label('component_name'),
            User.username.label('performed_by'),
            WorkOrder.title.label('work_order_title')
        ).join(
            Machine, MaintenanceLog.machine_id == Machine.id
        ).outerjoin(
            Component, MaintenanceLog.component_id == Component.id
        ).join(
            User, MaintenanceLog.performed_by == User.id
        ).outerjoin(
            WorkOrder, MaintenanceLog.work_order_id == WorkOrder.id
        )
        
        # Apply filters
        if machine_id:
            query = query.filter(MaintenanceLog.machine_id == machine_id)
        if start_date:
            query = query.filter(MaintenanceLog.timestamp >= start_date)
        if end_date:
            query = query.filter(MaintenanceLog.timestamp <= end_date)
            
        # Execute query
        results = query.all()
        
        # Convert to list of dictionaries
        data = []
        for row in results:
            log = row[0]
            
            # Get any failures associated with this log
            failures = Failure.query.filter_by(maintenance_log_id=log.id).all()
            failure_descriptions = "; ".join([f.description for f in failures]) if failures else "None"
            
            data.append({
                'ID': log.id,
                'Date': log.timestamp.strftime('%Y-%m-%d %H:%M'),
                'Machine': row.machine_name,
                'Component': row.component_name,
                'Performed By': row.performed_by,
                'Work Order': row.work_order_title,
                'Description': log.description,
                'Type': log.maintenance_type,
                'Category': log.maintenance_category,
                'Hour Counter': log.hour_counter,
                'Deviations Found': 'Yes' if log.has_deviation else 'No',
                'Deviation Details': failure_descriptions
            })
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Write to Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Maintenance Logs', index=False)
            worksheet = writer.sheets['Maintenance Logs']
            
            # Format the worksheet
            for i, col in enumerate(df.columns):
                # Set column width based on content
                max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, max_len)
        
        output.seek(0)
        return output
        
    @staticmethod
    def export_statistics_report(machine_id=None, start_date=None, end_date=None):
        """Export a comprehensive statistics report"""
        from backend.services.statistics import MaintenanceStatistics
        
        # Get statistics
        failure_rates = MaintenanceStatistics.get_failure_rates(machine_id, start_date, end_date)
    
        mtbf_mttr = MaintenanceStatistics.get_mtbf_mttr(machine_id, start_date, end_date)
        work_order_stats = MaintenanceStatistics.get_work_order_statistics(machine_id, start_date, end_date)
        
        # Create Excel workbook with multiple sheets
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Failure rates sheet
            if failure_rates:
                df_failure = pd.DataFrame(failure_rates)
                df_failure.to_excel(writer, sheet_name='Failure Rates', index=False)
            
            
            # MTBF/MTTR sheet
            if mtbf_mttr:
                df_mtbf = pd.DataFrame(mtbf_mttr)
                df_mtbf.to_excel(writer, sheet_name='MTBF & MTTR', index=False)
            
            # Work order statistics sheet
            if work_order_stats:
                # This one needs flattening since it has nested dicts
                flattened_data = []
                for stat in work_order_stats:
                    flat_stat = {
                        'Machine ID': stat['machine_id'],
                        'Machine Name': stat['machine_name'],
                        'Total Work Orders': stat['total_work_orders'],
                        'Preventive Orders': stat['by_type']['preventive'],
                        'Predictive Orders': stat['by_type']['predictive'],
                        'Corrective Orders': stat['by_type']['corrective'],
                        'Open Orders': stat['by_status']['open'],
                        'In Progress Orders': stat['by_status']['in_progress'],
                        'Completed Orders': stat['by_status']['completed']
                    }
                    flattened_data.append(flat_stat)
                
                df_wo_stats = pd.DataFrame(flattened_data)
                df_wo_stats.to_excel(writer, sheet_name='Work Order Stats', index=False)
        
        output.seek(0)
        return output