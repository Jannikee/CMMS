"""
Work order generation service
"""
from backend.models.machine import Machine, Component
from backend.models.work_order import WorkOrder
from backend.models.rcm import RCMUnit, RCMFunction ,RCMFunctionalFailure, RCMMaintenance , RCMFailureEffect
from backend.database import db
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

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
                        due_date=datetime.now(timezone.utc) + timedelta(days=3),
                        status='open',
                        priority='normal',
                        type='preventive',
                        frequency= 'periodic',  # Added for mobile_app tabs
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
        
        current_date = datetime.now(timezone.utc)
        
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
                            frequency= 'periodic',  # Added for mobile_app tabs
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
                    frequency= 'periodic',  # Added for mobile_app tabs
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
        due_date = datetime.now(timezone.utc) + timedelta(days=due_date_days.get(severity, 7))
        
        work_order = WorkOrder(
            title=f"Fix {severity} issue with {component_name} on {machine.name}",
            description=f"Repair required due to reported deviation: {deviation_description}",
            due_date=due_date,
            status='open',
            priority=priority,
            type='corrective',
            frequency= 'periodic',  # Added for mobile_app tabs UNSURE IF CORRECT HERE
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
        current_date = datetime.now(timezone.utc)
        
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
                    frequency= 'daily',  # Added for mobile_app tabs
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

    # In backend/services/work_order_generator.py, update the generate_from_rcm method:

    @staticmethod
    def generate_from_rcm(equipment_id):
        """Generate work orders based on RCM analysis"""
        from backend.models.machine import Machine, Subsystem, Component
        from backend.models.work_order import WorkOrder
        from backend.models.rcm import RCMMaintenance, RCMFailureMode, RCMFunctionalFailure, RCMFunction, RCMUnit
        from datetime import datetime, timedelta, timezone
        
        # Verify equipment exists
        machine = Machine.query.get(equipment_id)
        if not machine:
            raise ValueError(f"Machine with ID {equipment_id} not found")
        
        logger.info(f"Generating work orders for equipment {equipment_id} - {machine.name}")
        
        created_work_orders = []
        
        # Get all maintenance actions for this equipment through the RCM hierarchy
        maintenance_actions = db.session.query(
            RCMMaintenance,
            RCMFailureMode,
            RCMFunctionalFailure,
            RCMFunction,
            RCMUnit
        ).join(
            RCMFailureMode, RCMMaintenance.failure_mode_id == RCMFailureMode.id
        ).join(
            RCMFunctionalFailure, RCMFailureMode.functional_failure_id == RCMFunctionalFailure.id
        ).join(
            RCMFunction, RCMFunctionalFailure.function_id == RCMFunction.id
        ).join(
            RCMUnit, RCMFunction.unit_id == RCMUnit.id
        ).filter(
            RCMUnit.equipment_id == equipment_id
        ).all()
        
        logger.info(f"Found {len(maintenance_actions)} maintenance actions for equipment {equipment_id}")
        
        for maint, mode, failure, function, unit in maintenance_actions:
            try:
            # Determine subsystem based on unit technical_id
                subsystem_id = None
                component_id = None
                
                # Parse the unit technical_id to determine hierarchy level
                if unit.technical_id:
                    parts = unit.technical_id.split('.')
                    if len(parts) == 2:  # This is a subsystem (e.g., "1077.01")
                        # Find the subsystem with this technical_id
                        subsystem = Subsystem.query.filter_by(technical_id=unit.technical_id).first()
                        if subsystem:
                            subsystem_id = subsystem.id
                    elif len(parts) == 3:  # This is a component (e.g., "1077.01.001")
                        # Find the component with this technical_id
                        component = Component.query.filter_by(technical_id=unit.technical_id).first()
                        if component:
                            component_id = component.id
                            subsystem_id = component.subsystem_id
                # Determine work order type based on maintenance type
                work_order_type = 'preventive'
                if maint.maintenance_type:
                    if 'predict' in maint.maintenance_type.lower():
                        work_order_type = 'predictive'
                    elif 'correct' in maint.maintenance_type.lower():
                        work_order_type = 'corrective'
                
                # Determine due date based on intervals
                due_date = datetime.now(timezone.utc) + timedelta(days=7)  # Default to a week
                
                if maint.interval_days:
                    due_date = datetime.now(timezone.utc) + timedelta(days=maint.interval_days)
                elif maint.interval_hours and machine.hour_counter:
                    # Convert hours to estimated days based on average usage
                    # Assuming 8 hours of operation per day
                    estimated_days = maint.interval_hours / 8
                    due_date = datetime.now(timezone.utc) + timedelta(days=estimated_days)
                
                # Build work order title and description
                title = f"{maint.title or 'Maintenance'} - {function.name}"
                
                description = f"RCM-based maintenance action\n\n"
                description += f"Unit: {unit.name} ({unit.technical_id})\n"
                description += f"Function: {function.name}\n"
                description += f"Functional Failure: {failure.name}\n"
                description += f"Failure Mode: {mode.name}\n"
                description += f"Action: {maint.description or maint.title}\n"
                
                # Check if a similar work order already exists and is still open
                existing_order = WorkOrder.query.filter(
                    WorkOrder.machine_id == equipment_id,
                    WorkOrder.title == title,
                    WorkOrder.status.in_(['open', 'in_progress']),
                    WorkOrder.generation_source == 'rcm'
                ).first()
                
                if not existing_order:
                    # Determine priority based on interval
                    priority = 'normal'
                    if maint.interval_days and maint.interval_days <= 7:
                        priority = 'high'
                    elif maint.interval_days and maint.interval_days <= 3:
                        priority = 'critical'
                    
                    # Create the work order
                    work_order = WorkOrder(
                        title=title,
                        description=description,
                        due_date=due_date,
                        status='open',
                        priority=priority,
                        type=work_order_type,
                        frequency='periodic',
                        category='rcm_maintenance',
                        machine_id=equipment_id,
                        subsystem_id=subsystem_id,  # Now properly linked based on technical_id
                        component_id=component_id, 
                        reason=f"RCM maintenance for: {mode.name}",
                        generation_source='rcm',
                        tool_requirements=''
                    )
                    
                    db.session.add(work_order)
                    created_work_orders.append(work_order)
                    
                    logger.info(f"Created work order: {title} (subsystem_id: {subsystem_id}, component_id: {component_id})")
                else:
                    logger.info(f"Work order already exists for: {title}")
                    
            except Exception as e:
                logger.error(f"Error creating work order for maintenance action {maint.id}: {str(e)}")
                continue
        
        if created_work_orders:
            db.session.commit()
            logger.info(f"Successfully created {len(created_work_orders)} work orders")
        else:
            logger.info("No new work orders created")
        
        return created_work_orders
    """"
    @staticmethod
    def generate_from_rcm_analysis(machine_id, component_id, failure_mode, recommended_action, priority='normal'):
        #Generate a work order based on RCM (Reliability Centered Maintenance) analysis
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
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
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

        """