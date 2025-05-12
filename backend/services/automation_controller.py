"""
Controller for automating maintenance optimization
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from backend.database import db
from backend.models.machine import Machine, Component
from backend.models.maintenance_settings import OptimizationResult, MaintenanceSettings, IntervalAdjustmentHistory
from backend.services.interval_optimization import IntervalOptimizationService
from backend.services.interval_adjustment import IntervalAdjustmentService

logger = logging.getLogger(__name__)

class AutomationController:
    """Controller for automating the maintenance optimization loop"""
    
    @staticmethod
    def run_scheduled_optimizations(use_kaplan_meier=False):
        """
        Run scheduled optimizations for all eligible components
        Args:
            use_kaplan_meier: If True, use Kaplan-Meier instead of Weibull analysis
        Returns:
            Dictionary with optimization results
        """
        logger.info("Starting scheduled maintenance interval optimizations")
        
        # Get components with automatic adjustments enabled
        settings = MaintenanceSettings.query.filter_by(auto_adjust_enabled=True).all()
        component_ids = [s.component_id for s in settings if s.component_id is not None]
        
        # Add components that haven't been analyzed recently
        last_analysis_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        recent_analyses = OptimizationResult.query.filter(
            OptimizationResult.analysis_timestamp >= last_analysis_cutoff
        ).all()
        
        analyzed_component_ids = [a.component_id for a in recent_analyses]
        
        # Find components without recent analysis
        components_without_analysis = Component.query.filter(
            ~Component.id.in_(analyzed_component_ids)
        ).all()
        
        for component in components_without_analysis:
            if component.id not in component_ids:
                component_ids.append(component.id)
        
        logger.info(f"Found {len(component_ids)} components for optimization analysis")
        
        results = []
        for component_id in component_ids:
            try:
                # Run analysis with selected method
                recommendation = IntervalOptimizationService.analyze_component_maintenance(
                    component_id,
                    use_kaplan_meier=use_kaplan_meier
                )
                
                if recommendation:
                    # Check if automatic adjustments are allowed
                    component_setting = MaintenanceSettings.query.filter_by(
                        component_id=component_id
                    ).first()
                    
                    auto_adjust = False
                    require_approval = True
                    min_confidence = 0.7
                    
                    if component_setting:
                        auto_adjust = component_setting.auto_adjust_enabled
                        require_approval = component_setting.require_approval
                        min_confidence = component_setting.min_confidence
                    
                    # If auto-adjust is enabled and either approval is not required or confidence is high
                    if auto_adjust and (not require_approval or recommendation["confidence"] >= min_confidence):
                        # Apply changes
                        adjustment_result = IntervalAdjustmentService.apply_optimization_results(recommendation)
                        
                        # Update optimization result
                        optimization = OptimizationResult.query.get(recommendation.get("analysis_id"))
                        if optimization:
                            optimization.applied = True
                            optimization.applied_timestamp = datetime.now(timezone.utc)
                            db.session.commit()
                        
                        # Record the results
                        results.append({
                            "component_id": component_id,
                            "component_name": recommendation["component_name"] if "component_name" in recommendation else "",
                            "recommendation": recommendation,
                            "adjustments": adjustment_result,
                            "automatic": True
                        })
                    else:
                        # Just record the recommendation for manual review
                        results.append({
                            "component_id": component_id,
                            "component_name": recommendation["component_name"] if "component_name" in recommendation else "",
                            "recommendation": recommendation,
                            "automatic": False,
                            "reason": "Requires manual approval" if require_approval else "Automatic adjustment not enabled"
                        })
            except Exception as e:
                logger.error(f"Error analyzing component {component_id}: {str(e)}")
                results.append({
                    "component_id": component_id,
                    "error": str(e)
                })
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components_analyzed": len(component_ids),
            "optimizations_needed": sum(1 for r in results if "recommendation" in r and r["recommendation"]["needs_adjustment"]),
            "optimizations_applied": sum(1 for r in results if "automatic" in r and r["automatic"]),
            "errors": sum(1 for r in results if "error" in r),
            "results": results
        }
    
    @staticmethod
    def generate_updated_work_orders():
        """Generate new work orders based on updated maintenance intervals"""
        logger.info("Generating work orders based on updated maintenance intervals")
        
        # Generate work orders
        created_orders = IntervalAdjustmentService.generate_updated_work_orders()
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "work_orders_generated": len(created_orders),
            "work_order_ids": [wo.id for wo in created_orders]
        }
    
    @staticmethod
    def validate_optimization_effectiveness(days=90):
        """
        Validate the effectiveness of previous interval optimizations
        by comparing expected vs. actual outcomes
        """
        logger.info(f"Validating effectiveness of interval optimizations over the past {days} days")
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get applied optimizations in the period
        applied_optimizations = OptimizationResult.query.filter(
            OptimizationResult.applied == True,
            OptimizationResult.applied_timestamp >= cutoff_date
        ).all()
        
        logger.info(f"Found {len(applied_optimizations)} applied optimizations to validate")
        
        results = []
        
        for optimization in applied_optimizations:
            try:
                # Get the recommendation details
                recommendation = json.loads(optimization.recommendation_details)
                
                # Get the component
                component = Component.query.get(optimization.component_id)
                if not component:
                    continue
                
                # Get failures before and after the optimization
                from backend.models.maintenance_log import MaintenanceLog
                from backend.models.failure import Failure
                
                # Time period before optimization of equal length to time since optimization
                time_since_optimization = datetime.now(timezone.utc) - optimization.applied_timestamp
                before_start = optimization.applied_timestamp - time_since_optimization
                
                # Failures before optimization
                failures_before = db.session.query(Failure)\
                    .join(MaintenanceLog, Failure.maintenance_log_id == MaintenanceLog.id)\
                    .filter(MaintenanceLog.component_id == component.id)\
                    .filter(MaintenanceLog.timestamp >= before_start)\
                    .filter(MaintenanceLog.timestamp < optimization.applied_timestamp)\
                    .count()
                
                # Failures after optimization
                failures_after = db.session.query(Failure)\
                    .join(MaintenanceLog, Failure.maintenance_log_id == MaintenanceLog.id)\
                    .filter(MaintenanceLog.component_id == component.id)\
                    .filter(MaintenanceLog.timestamp >= optimization.applied_timestamp)\
                    .count()
                
                # Preventive maintenance actions before and after
                maintenance_before = db.session.query(MaintenanceLog)\
                    .filter(MaintenanceLog.component_id == component.id)\
                    .filter(MaintenanceLog.has_deviation == False)\
                    .filter(MaintenanceLog.timestamp >= before_start)\
                    .filter(MaintenanceLog.timestamp < optimization.applied_timestamp)\
                    .count()
                    
                maintenance_after = db.session.query(MaintenanceLog)\
                    .filter(MaintenanceLog.component_id == component.id)\
                    .filter(MaintenanceLog.has_deviation == False)\
                    .filter(MaintenanceLog.timestamp >= optimization.applied_timestamp)\
                    .count()
                
                # Calculate effectiveness metrics
                days_before = (optimization.applied_timestamp - before_start).days
                days_after = (datetime.now(timezone.utc) - optimization.applied_timestamp).days
                
                failures_per_day_before = failures_before / max(days_before, 1)
                failures_per_day_after = failures_after / max(days_after, 1)
                
                maintenance_per_day_before = maintenance_before / max(days_before, 1)
                maintenance_per_day_after = maintenance_after / max(days_after, 1)
                
                # Calculate if optimization was effective
                failure_reduction = 1 - (failures_per_day_after / failures_per_day_before) if failures_per_day_before > 0 else 0
                maintenance_reduction = 1 - (maintenance_per_day_after / maintenance_per_day_before) if maintenance_per_day_before > 0 else 0
                
                was_effective = False
                
                # If recommendation was to increase interval (reduce frequency)
                if any(interval.get("recommended_interval", 0) > interval.get("current_interval", 0) 
                       for interval in recommendation.get("recommended_intervals", [])):
                    # Success if maintenance frequency decreased without significant increase in failures
                    was_effective = maintenance_reduction > 0.1 and failures_per_day_after <= failures_per_day_before * 1.2
                
                # If recommendation was to decrease interval (increase frequency)
                elif any(interval.get("recommended_interval", 0) < interval.get("current_interval", 0) 
                         for interval in recommendation.get("recommended_intervals", [])):
                    # Success if failure rate decreased
                    was_effective = failure_reduction > 0.2
                
                results.append({
                    "optimization_id": optimization.id,
                    "component_id": component.id,
                    "component_name": component.name,
                    "applied_timestamp": optimization.applied_timestamp.isoformat(),
                    "days_before": days_before,
                    "days_after": days_after,
                    "failures_before": failures_before,
                    "failures_after": failures_after,
                    "failures_per_day_before": failures_per_day_before,
                    "failures_per_day_after": failures_per_day_after,
                    "failure_reduction_percent": failure_reduction * 100,
                    "maintenance_before": maintenance_before,
                    "maintenance_after": maintenance_after,
                    "maintenance_per_day_before": maintenance_per_day_before,
                    "maintenance_per_day_after": maintenance_per_day_after,
                    "maintenance_reduction_percent": maintenance_reduction * 100,
                    "was_effective": was_effective
                })
                
            except Exception as e:
                logger.error(f"Error validating optimization {optimization.id}: {str(e)}")
                results.append({
                    "optimization_id": optimization.id,
                    "error": str(e)
                })
        
        # Calculate overall effectiveness
        effective_count = sum(1 for r in results if r.get("was_effective", False))
        total_evaluations = sum(1 for r in results if "was_effective" in r)
        
        effectiveness_rate = effective_count / total_evaluations if total_evaluations > 0 else 0
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "optimizations_evaluated": total_evaluations,
            "effective_optimizations": effective_count,
            "effectiveness_rate": effectiveness_rate,
            "results": results
        }