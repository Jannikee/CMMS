"""
Work order generation service
"""
from backend.models.machine import Machine, Component
from backend.models.work_order import WorkOrder
from backend.database import db
from datetime import datetime, timedelta

class WorkOrderGenerator:
    @staticmethod
    def generate_hour_based_orders():
        """Generate work orders based on machine hour counters"""
        machines = Machine.query.all()
        work_orders_created = []
        
        for machine in machines:
            # Example threshold: create maintenance work order every 100 hours
            if machine.hour_counter and machine.hour_counter % 100 < 5:  # Within 5 hours of threshold
                # Check if there's already an open work order for this machine based on hour counter
                existing_order = WorkOrder.query.filter_by(
                    machine_id=machine.id,
                    status='open',
                    generation_source='hour_counter'
                ).first()
                
                if not existing_order:
                    work_order = WorkOrder(
                        title=f"Regular maintenance for {machine.name} - {machine.hour_counter} hours",
                        description=f"Perform regular maintenance after {machine.hour_counter} hours of operation.",
                        due_date=datetime.utcnow() + timedelta(days=3),
                        status='open',
                        priority='normal',
                        type='preventive',
                        category='regular_maintenance',
                        machine_id=machine.id,
                        generation_source='hour_counter',
                        reason=f"Machine has reached {machine.hour_counter} operating hours"
                    )
                    
                    db.session.add(work_order)
                    work_orders_created.append(work_order)
        
        if work_orders_created:
            db.session.commit()
        
        return work_orders_created
    
    @staticmethod
    def generate_calendar_based_orders():
        """Generate work orders based on calendar periods"""
        machines = Machine.query.all()
        work_orders_created = []
        
        current_date = datetime.utcnow()
        
        for machine in machines:
            # Example: monthly maintenance check
            if machine.last_maintenance:
                days_since_maintenance = (current_date - machine.last_maintenance).days
                
                # If more than 30 days since last maintenance
                if days_since_maintenance >= 30:
                    # Check if there's already an open calendar-based work order
                    existing_order = WorkOrder.query.filter_by(
                        machine_id=machine.id,
                        status='open',
                        generation_source='calendar'
                    ).first()
                    
                    if not existing_order:
                        work_order = WorkOrder(
                            title=f"Monthly maintenance for {machine.name}",
                            description=f"Perform monthly maintenance check. Last maintenance: {machine.last_maintenance.strftime('%Y-%m-%d')}",
                            due_date=current_date + timedelta(days=7),
                            status='open',
                            priority='normal',
                            type='preventive',
                            category='regular_inspection',
                            machine_id=machine.id,
                            generation_source='calendar',
                            reason="Monthly maintenance schedule"
                        )
                        
                        db.session.add(work_order)
                        work_orders_created.append(work_order)
            else:
                # If no maintenance record exists, create initial inspection
                work_order = WorkOrder(
                    title=f"Initial inspection for {machine.name}",
                    description="Perform initial inspection and maintenance check.",
                    due_date=current_date + timedelta(days=3),
                    status='open',
                    priority='high',
                    type='preventive',
                    category='initial_inspection',
                    machine_id=machine.id,
                    generation_source='calendar',
                    reason="No maintenance record exists"
                )
                
                db.session.add(work_order)
                work_orders_created.append(work_order)
        
        if work_orders_created:
            db.session.commit()
        
        return work_orders_created
    
    @staticmethod
    def generate_from_deviation(machine_id, component_id, deviation_description, severity):
        """Generate a work order based on a reported deviation/failure"""
        machine = Machine.query.get(machine_id)
        if not machine:
            return None
        
        component = None
        component_name = "machine"
        if component_id:
            component = Component.query.get(component_id)
            if component:
                component_name = component.name
        
        # Set priority based on severity
        priority_map = {
            'minor': 'normal',
            'major': 'high',
            'critical': 'critical'
        }
        priority = priority_map.get(severity, 'normal')
        
        # Set due date based on severity
        due_date_days = {
            'minor': 7,
            'major': 3,
            'critical': 1
        }
        due_date = datetime.utcnow() + timedelta(days=due_date_days.get(severity, 7))
        
        work_order = WorkOrder(
            title=f"Fix {severity} issue with {component_name} on {machine.name}",
            description=f"Repair required due to reported deviation: {deviation_description}",
            due_date=due_date,
            status='open',
            priority=priority,
            type='corrective',
            category='repair',
            machine_id=machine_id,
            component_id=component_id,
            generation_source='deviation',
            reason=f"Reported {severity} deviation: {deviation_description}"
        )
        
        db.session.add(work_order)
        db.session.commit()
        
        return work_order
    
    @staticmethod
    def create_scheduled_maintenance_plan(machine_id, schedule_config):
        """Create a maintenance plan with multiple scheduled work orders"""
        machine = Machine.query.get(machine_id)
        if not machine:
            return []
        
        work_orders_created = []
        current_date = datetime.utcnow()
        
        # Example schedule_config format:
        # [
        #   {"type": "cleaning", "interval_days": 7, "description": "Weekly cleaning"},
        #   {"type": "inspection", "interval_days": 30, "description": "Monthly inspection"},
        #   {"type": "lubrication", "interval_days": 90, "description": "Quarterly lubrication"}
        # ]
        
        for config in schedule_config:
            interval_days = config.get('interval_days', 30)
            maintenance_type = config.get('type', 'inspection')
            description = config.get('description', f"{maintenance_type.capitalize()} maintenance")
            
            # Create work orders for the next 6 months
            for i in range(1, 7):
                due_date = current_date + timedelta(days=interval_days * i)
                
                work_order = WorkOrder(
                    title=f"{maintenance_type.capitalize()} for {machine.name}",
                    description=description,
                    due_date=due_date,
                    status='scheduled',  # Use 'scheduled' for future work orders
                    priority='normal',
                    type='preventive',
                    category=maintenance_type,
                    machine_id=machine_id,
                    generation_source='maintenance_plan',
                    reason=f"Scheduled {maintenance_type} every {interval_days} days"
                )
                
                db.session.add(work_order)
                work_orders_created.append(work_order)
        
        if work_orders_created:
            db.session.commit()
        
        return work_orders_created
    
    @staticmethod
    def generate_from_rcm_analysis(machine_id, component_id, failure_mode, recommended_action, priority='normal'):
        """Generate a work order based on RCM (Reliability Centered Maintenance) analysis"""
        machine = Machine.query.get(machine_id)
        if not machine:
            return None
        
        component = None
        component_name = "machine"
        if component_id:
            component = Component.query.get(component_id)
            if component:
                component_name = component.name
        
        work_order = WorkOrder(
            title=f"RCM: {recommended_action} for {component_name} on {machine.name}",
            description=f"Based on RCM analysis, perform {recommended_action} to prevent {failure_mode}.",
            due_date=datetime.utcnow() + timedelta(days=7),
            status='open',
            priority=priority,
            type='predictive',
            category='rcm_action',
            machine_id=machine_id,
            component_id=component_id,
            generation_source='rcm',
            reason=f"RCM analysis identified potential failure mode: {failure_mode}"
        )
        
        db.session.add(work_order)
        db.session.commit()
        
        return work_order