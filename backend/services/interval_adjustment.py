"""
Service for applying interval adjustments to maintenance schedules
"""
from datetime import datetime, timedelta, timezone
from backend.database import db
from backend.models.rcm import RCMMaintenance
from backend.models.work_order import WorkOrder
from backend.models.maintenance_settings import IntervalAdjustmentHistory
import logging

logger = logging.getLogger(__name__)

class IntervalAdjustmentService:
    """Service for applying interval adjustments to maintenance schedules"""
    
    @staticmethod
    def update_maintenance_interval(maintenance_id, new_interval, interval_type="hours", reason="", user_id=None):
        """
        Update a maintenance action's interval
        Args:
            maintenance_id: ID of the RCMMaintenance to update
            new_interval: New interval value
            interval_type: 'hours' or 'days'
            reason: Reason for adjustment
            user_id: ID of the user making the change (None for automated adjustments)
        Returns:
            Dictionary with update results
        """
        maintenance = RCMMaintenance.query.get(maintenance_id)
        if not maintenance:
            return {"success": False, "message": "Maintenance action not found"}
            
        # Store the current values for history
        old_interval_hours = maintenance.interval_hours
        old_interval_days = maintenance.interval_days
        
        # Update the appropriate interval
        if interval_type == "hours":
            maintenance.interval_hours = new_interval
        elif interval_type == "days":
            maintenance.interval_days = new_interval
        else:
            return {"success": False, "message": "Invalid interval type"}
            
        # Create history record
        adjustment = IntervalAdjustmentHistory(
            maintenance_id=maintenance_id,
            old_interval_hours=old_interval_hours,
            old_interval_days=old_interval_days,
            new_interval_hours=maintenance.interval_hours,
            new_interval_days=maintenance.interval_days,
            reason=reason,
            user_id=user_id,
            automated=user_id is None,
            timestamp=datetime.now(timezone.utc)
        )
        
        db.session.add(adjustment)
        db.session.commit()
        
        return {
            "success": True, 
            "maintenance_id": maintenance_id,
            "old_interval": old_interval_hours if interval_type == "hours" else old_interval_days,
            "new_interval": new_interval,
            "interval_type": interval_type,
            "adjustment_id": adjustment.id
        }
    
    @staticmethod
    def apply_optimization_results(recommendation, user_id=None):
        """
        Apply optimization results to the maintenance schedule
        Args:
            recommendation: Recommendation object from IntervalOptimizationService
            user_id: ID of the user applying the changes (None for automated adjustments)
        Returns:
            Dictionary with results of the changes
        """
        if not recommendation["needs_adjustment"]:
            return {"success": True, "message": "No adjustments needed", "changes": []}
            
        changes = []
        
        for interval in recommendation["recommended_intervals"]:
            if interval["needs_adjustment"]:
                interval_type = interval["interval_type"]
                
                result = IntervalAdjustmentService.update_maintenance_interval(
                    interval["action_id"],
                    interval["recommended_interval"],
                    interval_type,
                    interval["reason"],
                    user_id
                )
                
                if result["success"]:
                    changes.append({
                        "action_id": interval["action_id"],
                        "action_title": interval["action_title"],
                        "old_interval": interval["current_interval"],
                        "new_interval": interval["recommended_interval"],
                        "interval_type": interval_type,
                        "reason": interval["reason"],
                        "adjustment_id": result["adjustment_id"]
                    })
                    
                    # Now update any existing work orders
                    updated_orders = IntervalAdjustmentService.update_work_orders_for_maintenance(
                        interval["action_id"], 
                        interval["recommended_interval"],
                        interval_type
                    )
                    
                    changes[-1]["updated_work_orders"] = updated_orders
        
        return {
            "success": True,
            "component_id": recommendation["component_id"],
            "component_name": recommendation["component_name"],
            "changes": changes
        }
    
    @staticmethod
    def update_work_orders_for_maintenance(maintenance_id, new_interval, interval_type):
        """
        Update open work orders for a maintenance action with new interval
        Args:
            maintenance_id: RCMMaintenance ID
            new_interval: New interval value
            interval_type: 'hours' or 'days'
        Returns:
            List of updated work orders
        """
        # Find work orders generated from this maintenance action that are still open
        open_work_orders = WorkOrder.query.filter_by(
            generation_source='rcm',
            status='open'
        ).filter(
            WorkOrder.reason.like(f"%Maintenance ID: {maintenance_id}%")
        ).all()
        
        updated_orders = []
        
        for order in open_work_orders:
            # Recalculate due date for calendar-based maintenance
            if interval_type == "days" and new_interval is not None:
                # Find the base date (when the work order was created)
                creation_date = order.created_at
                
                # Calculate new due date
                new_due_date = creation_date + timedelta(days=new_interval)
                
                # Update the work order
                order.due_date = new_due_date
                order.reason += f" (Interval updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')})"
                
                updated_orders.append({
                    "work_order_id": order.id,
                    "work_order_title": order.title,
                    "new_due_date": new_due_date.isoformat()
                })
        
        if updated_orders:
            db.session.commit()
            
        return updated_orders
    
    @staticmethod
    def generate_updated_work_orders():
        """
        Generate work orders based on updated maintenance intervals
        Returns:
            List of created work orders
        """
        from backend.models.rcm import RCMFailureMode, RCMFunctionalFailure, RCMFunction
        from backend.models.machine import Machine, Component
        
        # Find maintenance actions with recent interval adjustments (last 7 days)
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=7)
        recent_adjustments = IntervalAdjustmentHistory.query.filter(
            IntervalAdjustmentHistory.timestamp >= cutoff_time
        ).all()
        
        # Get unique maintenance IDs
        maintenance_ids = set()
        for adj in recent_adjustments:
            maintenance_ids.add(adj.maintenance_id)
        
        # Generate work orders
        created_orders = []
        
        for maintenance_id in maintenance_ids:
            # Get the maintenance action
            maintenance = RCMMaintenance.query.get(maintenance_id)
            if not maintenance:
                continue
                
            # Get related component
            component = None
            
            try:
                failure_mode = RCMFailureMode.query.get(maintenance.failure_mode_id)
                if not failure_mode:
                    continue
                    
                failure = RCMFunctionalFailure.query.get(failure_mode.functional_failure_id)
                if not failure:
                    continue
                    
                function = RCMFunction.query.get(failure.function_id)
                if not function or not function.component_id:
                    continue
                    
                component = Component.query.get(function.component_id)
                if not component:
                    continue
                    
                machine = Machine.query.get(component.machine_id)
                if not machine:
                    continue
            except Exception as e:
                logger.error(f"Error finding component for maintenance ID {maintenance_id}: {str(e)}")
                continue
                
            # Check if work order already exists
            existing_order = WorkOrder.query.filter_by(
                machine_id=machine.id,
                status='open',
                generation_source='rcm'
            ).filter(
                WorkOrder.reason.like(f"%Maintenance ID: {maintenance_id}%")
            ).first()
            
            if existing_order:
                # Already have an open work order for this maintenance action
                continue
                
            # Calculate due date based on interval type
            if maintenance.interval_days:
                due_date = datetime.now(timezone.utc) + timedelta(days=maintenance.interval_days)
            elif maintenance.interval_hours and machine.hour_counter:
                # Estimate due date based on operating hours
                # Calculate average operating hours per day
                if machine.expected_annual_usage:
                    hours_per_day = machine.expected_annual_usage / 365
                else:
                    hours_per_day = 8  # Default to 8 hours per day
                    
                # Calculate days until next maintenance
                days_until_maintenance = maintenance.interval_hours / hours_per_day
                due_date = datetime.now(timezone.utc) + timedelta(days=days_until_maintenance)
            else:
                # Default to 30 days if no interval set
                due_date = datetime.now(timezone.utc) + timedelta(days=30)
                
            # Create work order
            work_order = WorkOrder(
                title=f"{maintenance.title} - {component.name}",
                description=f"{maintenance.description}\n\nBased on RCM analysis for {component.name}.",
                machine_id=machine.id,
                component_id=component.id,
                due_date=due_date,
                status='open',
                priority='normal',
                type=maintenance.maintenance_type or 'preventive',
                category='rcm_maintenance',
                reason=f"Generated from RCM maintenance action. Maintenance ID: {maintenance_id}",
                generation_source='rcm'
            )
            
            db.session.add(work_order)
            created_orders.append(work_order)
            
        if created_orders:
            db.session.commit()
            
        return created_orders