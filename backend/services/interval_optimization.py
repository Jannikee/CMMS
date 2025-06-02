"""
Maintenance interval optimization service
This service analyzes component failure data and recommends optimal maintenance intervals
using either Weibull analysis or Kaplan-Meier survival analysis.
"""
import numpy as np
import json
import logging
from datetime import datetime, timedelta, timezone
from backend.database import db
from backend.models.machine import Machine, Component
from backend.models.maintenance_log import MaintenanceLog
from backend.models.failure import Failure
from backend.models.work_order import WorkOrder
from backend.models.rcm import RCMMaintenance, RCMFailureMode, RCMFunctionalFailure, RCMFunction
from backend.models.maintenance_settings import MaintenanceSettings, OptimizationResult
from backend.services.AdvancedStatistics import AdvancedStatistics

logger = logging.getLogger(__name__)

class IntervalOptimizationService:
    """Service for optimizing maintenance intervals based on statistical analysis"""
    
    # Thresholds for deciding when to adjust intervals
    FAILURE_RATE_THRESHOLD = 0.2  # 20% increase in failure rate
    MTBF_THRESHOLD = 0.2  # 20% decrease in MTBF
    MIN_DATA_POINTS = 3  # Minimum failures/maintenance logs needed for reliable analysis
    
    # Maximum adjustment percentages
    MAX_INTERVAL_INCREASE = 0.25  # Max 25% increase at once
    MAX_INTERVAL_DECREASE = 0.30  # Max 30% decrease at once
    
    # Absolute limits for intervals (in hours or days)
    MIN_HOUR_INTERVAL = 8  # Don't set intervals below 10 hours
    MAX_HOUR_INTERVAL = 10000  # Don't set intervals above 10000 hours
    MIN_DAY_INTERVAL = 1  # Don't set intervals below 1 day
    MAX_DAY_INTERVAL = 365  # Don't set intervals above 1 year
    
    # Reliability target (probability of survival)
    RELIABILITY_TARGET = 0.90  # 90% reliability
    
    @staticmethod
    def analyze_component_maintenance(component_id, look_back_days=180, use_kaplan_meier=False):
        """
        Analyze if current maintenance intervals are effective for a component
        and recommend adjustments if needed
        
        Args:
            component_id: ID of the component to analyze
            look_back_days: Number of days of historical data to analyze
            use_kaplan_meier: Whether to use Kaplan-Meier instead of Weibull
            
        Returns:
            Dict with analysis results and recommendations
        """
        component = Component.query.get(component_id)
        if not component:
            return None
            
        # Get machine for this component
        machine = Machine.query.get(component.machine_id)
        if not machine:
            return None
            
        # Find relevant RCM maintenance actions for this component
        maintenance_actions = db.session.query(RCMMaintenance)\
            .join(RCMFailureMode, RCMMaintenance.failure_mode_id == RCMFailureMode.id)\
            .join(RCMFunctionalFailure, RCMFailureMode.functional_failure_id == RCMFunctionalFailure.id)\
            .join(RCMFunction, RCMFunctionalFailure.function_id == RCMFunction.id)\
            .filter(RCMFunction.component_id == component_id)\
            .all()
            
        if not maintenance_actions:
            return None  # No maintenance actions to optimize
            
        # Get component settings
        settings = MaintenanceSettings.query.filter_by(component_id=component_id).first()
        if settings:
            # Use settings from database if available
            reliability_target = settings.reliability_target
            max_increase = settings.max_increase_percent / 100
            max_decrease = settings.max_decrease_percent / 100
        else:
            # Use defaults
            reliability_target = IntervalOptimizationService.RELIABILITY_TARGET
            max_increase = IntervalOptimizationService.MAX_INTERVAL_INCREASE
            max_decrease = IntervalOptimizationService.MAX_INTERVAL_DECREASE
        
        # Calculate date range for analysis
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=look_back_days)
        
        # Get failures in the period
        failures = db.session.query(Failure)\
            .join(MaintenanceLog, Failure.maintenance_log_id == MaintenanceLog.id)\
            .filter(MaintenanceLog.component_id == component_id)\
            .filter(MaintenanceLog.timestamp >= start_date)\
            .filter(MaintenanceLog.timestamp <= end_date)\
            .all()
            
        # Get maintenance logs in the period (non-failure)
        maintenance_logs = db.session.query(MaintenanceLog)\
            .filter(MaintenanceLog.component_id == component_id)\
            .filter(MaintenanceLog.timestamp >= start_date)\
            .filter(MaintenanceLog.timestamp <= end_date)\
            .filter(MaintenanceLog.has_deviation == False)\
            .all()
        
        # Perform statistical analysis
        if use_kaplan_meier:
            analysis_results = AdvancedStatistics.perform_kaplan_meier_analysis(component_id, look_back_days)
            analysis_method = "kaplan_meier"
        else:
            analysis_results = AdvancedStatistics.perform_weibull_analysis(component_id, look_back_days)
            analysis_method = "weibull"
            
        if not analysis_results or not analysis_results.get("success", False):
            # Not enough data or analysis failed
            return {
                "component_id": component_id,
                "component_name": component.name,
                "needs_adjustment": False,
                "reason": analysis_results.get("message", "Analysis failed"),
                "confidence": 0.0,
                "analysis_data": {
                    "failure_count": len(failures),
                    "maintenance_count": len(maintenance_logs),
                    "analysis_method": analysis_method
                }
            }
            
        # Calculate operating hours
        operating_hours = analysis_results.get("operating_hours", 0)
        
        # Create recommendation object
        recommendation = {
            "component_id": component_id,
            "component_name": component.name,
            "machine_id": machine.id,
            "machine_name": machine.name,
            "maintenance_action_ids": [action.id for action in maintenance_actions],
            "current_intervals": [],
            "recommended_intervals": [],
            "needs_adjustment": False,
            "confidence": 0.0,
            "reason": "",
            "analysis_data": {
                "failure_count": len(failures),
                "maintenance_count": len(maintenance_logs),
                "operating_hours": operating_hours,
                "analysis_method": analysis_method
            }
        }
        
        # Add analysis data to recommendation
        if analysis_method == "weibull":
            recommendation["analysis_data"]["weibull_shape"] = analysis_results.get("shape_parameter")
            recommendation["analysis_data"]["weibull_scale"] = analysis_results.get("scale_parameter")
            recommendation["analysis_data"]["weibull_r_squared"] = analysis_results.get("r_squared")
            recommendation["analysis_data"]["mtbf"] = analysis_results.get("mtbf")
            recommendation["analysis_data"]["reliability_intervals"] = analysis_results.get("reliability_intervals")
        else:
            recommendation["analysis_data"]["survival_curve"] = analysis_results.get("survival_curve")
            recommendation["analysis_data"]["median_survival"] = analysis_results.get("median_survival")
            recommendation["analysis_data"]["reliability_intervals"] = analysis_results.get("reliability_intervals")
            recommendation["analysis_data"]["n_events"] = analysis_results.get("n_events")
            recommendation["analysis_data"]["n_failures"] = analysis_results.get("n_failures")
        
        # Calculate confidence based on data quality
        r_squared = analysis_results.get("r_squared", 0.5)
        n_failures = analysis_results.get("failure_count", 0)
        
        if analysis_method == "weibull":
            if r_squared > 0.9 and n_failures >= 5:
                confidence = 0.9
            elif r_squared > 0.7 and n_failures >= 3:
                confidence = 0.75
            else:
                confidence = 0.6
        else:  # Kaplan-Meier
            n_events = analysis_results.get("n_events", 0)
            if n_failures >= 5 and n_events >= 10:
                confidence = 0.85
            elif n_failures >= 3 and n_events >= 5:
                confidence = 0.7
            else:
                confidence = 0.5
                
        recommendation["confidence"] = confidence
        
        # For each maintenance action, calculate optimal interval
        for action in maintenance_actions:
            current_interval = {
                "action_id": action.id,
                "action_title": action.title,
                "interval_hours": action.interval_hours,
                "interval_days": action.interval_days
            }
            recommendation["current_intervals"].append(current_interval)
            
            # Determine which interval type to optimize (hours or days)
            if action.interval_hours is not None and action.interval_hours > 0:
                # Hour-based interval
                current_hours = action.interval_hours
                interval_type = "hours"
                min_interval = IntervalOptimizationService.MIN_HOUR_INTERVAL
                max_interval = IntervalOptimizationService.MAX_HOUR_INTERVAL
                
                # Apply component-specific limits if set
                if settings and settings.min_interval_hours:
                    min_interval = settings.min_interval_hours
                if settings and settings.max_interval_hours:
                    max_interval = settings.max_interval_hours
                    
            elif action.interval_days is not None and action.interval_days > 0:
                # Day-based interval
                current_hours = action.interval_days * 24  # Convert to hours for analysis
                interval_type = "days"
                min_interval = IntervalOptimizationService.MIN_DAY_INTERVAL
                max_interval = IntervalOptimizationService.MAX_DAY_INTERVAL
                
                # Apply component-specific limits if set
                if settings and settings.min_interval_days:
                    min_interval = settings.min_interval_days
                if settings and settings.max_interval_days:
                    max_interval = settings.max_interval_days
            else:
                # No interval set, skip this action
                continue
                
            # Calculate optimal interval based on analysis method
            optimal_interval = None
            reason = ""
            
            if analysis_method == "weibull":
                # Get Weibull parameters
                shape = analysis_results.get("shape_parameter")
                scale = analysis_results.get("scale_parameter")
                
                if shape and scale:
                    # Interpret Weibull shape parameter
                    if shape < 0.9:
                        # Shape < 1 indicates infant mortality/early failures
                        # Decrease interval and recommend more careful inspection
                        decrease_factor = 0.7  # More significant decrease
                        optimal_interval = max(current_hours * decrease_factor, min_interval)
                        reason = f"Early failure pattern detected (Weibull shape={shape:.2f}). Recommend more frequent inspection."
                        
                    elif shape < 1.1:
                        # Shape ≈ 1 indicates random failures (exponential distribution)
                        # Adjust based on criticality
                        criticality = getattr(machine, 'criticality_factor', 5)
                        
                        if criticality > 7:
                            # High criticality - be conservative
                            decrease_factor = 0.9
                            optimal_interval = max(current_hours * decrease_factor, min_interval)
                            reason = f"Random failure pattern detected (Weibull shape={shape:.2f}). Conservative interval due to high criticality."
                        else:
                            # For random failures with low criticality, current interval may be appropriate
                            optimal_interval = current_hours
                            reason = f"Random failure pattern (Weibull shape={shape:.2f}). Current interval is appropriate."
                            
                    else:
                        # Shape > 1 indicates wear-out/aging
                        # Use reliability-based maintenance interval
                        target_key = f"{int(reliability_target*100)}%"
                        
                        if target_key in analysis_results.get("reliability_intervals", {}):
                            optimal_interval = analysis_results["reliability_intervals"][target_key]
                            
                            # Apply criticality factor
                            criticality = getattr(machine, 'criticality_factor', 5)
                            criticality_adjustment = 1.0 - (criticality / 20.0)  # 0.5 to 1.0
                            optimal_interval *= criticality_adjustment
                            
                            if optimal_interval > current_hours:
                                reason = f"Wear-out pattern detected (Weibull shape={shape:.2f}). Interval can be safely increased to meet {int(reliability_target*100)}% reliability target."
                            else:
                                reason = f"Wear-out pattern detected (Weibull shape={shape:.2f}). Interval should be reduced to meet {int(reliability_target*100)}% reliability target."
                        else:
                            # Fallback if reliability interval not available
                            optimal_interval = current_hours
                            reason = f"Wear-out pattern detected (Weibull shape={shape:.2f}). Insufficient data to calculate optimal interval."
                else:
                    # Missing Weibull parameters
                    optimal_interval = current_hours
                    reason = "Insufficient data for Weibull analysis"
                    
            else:  # Kaplan-Meier analysis
                # Get reliability intervals
                reliability_intervals = analysis_results.get("reliability_intervals", {})
                target_key = f"{int(reliability_target*100)}%"
                
                if target_key in reliability_intervals:
                    optimal_interval = reliability_intervals[target_key]
                    
                    # Apply criticality factor
                    criticality = getattr(machine, 'criticality_factor', 5)
                    criticality_adjustment = 1.0 - (criticality / 20.0)  # 0.5 to 1.0
                    optimal_interval *= criticality_adjustment
                    
                    if optimal_interval > current_hours:
                        reason = f"Kaplan-Meier analysis suggests interval can be safely increased to meet {int(reliability_target*100)}% reliability target."
                    else:
                        reason = f"Kaplan-Meier analysis suggests interval should be reduced to meet {int(reliability_target*100)}% reliability target."
                else:
                    # Use median survival time if target reliability interval not available
                    median_survival = analysis_results.get("median_survival")
                    
                    if median_survival:
                        # For preventive maintenance, we typically use 70-80% of median time to failure
                        optimal_interval = median_survival * 0.75
                        
                        # Apply criticality factor
                        criticality = getattr(machine, 'criticality_factor', 5)
                        if criticality > 7:
                            optimal_interval *= 0.8  # More conservative for critical components
                            
                        if optimal_interval > current_hours:
                            reason = f"Based on median survival time of {median_survival:.1f} hours, interval can be safely increased."
                        else:
                            reason = f"Based on median survival time of {median_survival:.1f} hours, interval should be reduced."
                    else:
                        # No reliable intervals available
                        optimal_interval = current_hours
                        reason = "Insufficient data for reliable Kaplan-Meier interval recommendation."
            
            # If we have a valid optimal interval, apply limits and check if adjustment is needed
            if optimal_interval:
                # Check if adjustment is significant (>10% change)
                change_ratio = optimal_interval / current_hours
                significant_change = change_ratio < 0.9 or change_ratio > 1.1
                
                if significant_change:
                    # Apply limits to the change
                    if optimal_interval > current_hours:
                        # Increasing interval
                        increase_factor = min(optimal_interval / current_hours, 1 + max_increase)
                        new_interval = min(current_hours * increase_factor, max_interval)
                    else:
                        # Decreasing interval
                        decrease_factor = max(optimal_interval / current_hours, 1 - max_decrease)
                        new_interval = max(current_hours * decrease_factor, min_interval)
                        
                    # Convert back to days if needed
                    if interval_type == "days":
                        new_interval = round(new_interval / 24)  # Hours to days
                    else:
                        new_interval = round(new_interval)  # Round to nearest hour
                        
                    # Add recommended interval
                    recommendation["recommended_intervals"].append({
                        "action_id": action.id,
                        "action_title": action.title,
                        "interval_type": interval_type,
                        "current_interval": current_hours if interval_type == "hours" else current_hours / 24,
                        "recommended_interval": new_interval,
                        "needs_adjustment": True,
                        "reason": reason,
                        "confidence": confidence
                    })
                    
                    # Mark overall recommendation as needing adjustment
                    recommendation["needs_adjustment"] = True
                    if not recommendation["reason"]:
                        recommendation["reason"] = reason
                else:
                    # No significant change needed
                    recommendation["recommended_intervals"].append({
                        "action_id": action.id,
                        "action_title": action.title,
                        "interval_type": interval_type,
                        "current_interval": current_hours if interval_type == "hours" else current_hours / 24,
                        "recommended_interval": current_hours if interval_type == "hours" else current_hours / 24,
                        "needs_adjustment": False,
                        "reason": f"Current interval is close to optimal ({int(change_ratio*100)}% of calculated optimal)",
                        "confidence": confidence
                    })
            else:
                # Could not calculate optimal interval
                recommendation["recommended_intervals"].append({
                    "action_id": action.id,
                    "action_title": action.title,
                    "interval_type": interval_type,
                    "current_interval": current_hours if interval_type == "hours" else current_hours / 24,
                    "recommended_interval": current_hours if interval_type == "hours" else current_hours / 24,
                    "needs_adjustment": False,
                    "reason": "Could not calculate optimal interval with available data",
                    "confidence": confidence * 0.5  # Lower confidence
                })
        
        # Store analysis result
        optimization_result = OptimizationResult(
            component_id=component_id,
            analysis_method=analysis_method,
            start_date=start_date,
            end_date=end_date,
            failure_count=recommendation["analysis_data"]["failure_count"],
            maintenance_count=recommendation["analysis_data"]["maintenance_count"],
            operating_hours=recommendation["analysis_data"]["operating_hours"],
            needs_adjustment=recommendation["needs_adjustment"],
            confidence=recommendation["confidence"],
            recommendation_details=json.dumps(recommendation)
        )
        
        # Add method-specific parameters
        if analysis_method == "weibull":
            optimization_result.weibull_shape = recommendation["analysis_data"].get("weibull_shape")
            optimization_result.weibull_scale = recommendation["analysis_data"].get("weibull_scale")
            optimization_result.weibull_r_squared = recommendation["analysis_data"].get("weibull_r_squared")
            if "mtbf" in recommendation["analysis_data"]:
                optimization_result.mtbf = recommendation["analysis_data"]["mtbf"]
        else:
            optimization_result.median_survival = recommendation["analysis_data"].get("median_survival")
        
        db.session.add(optimization_result)
        db.session.commit()
        
        # Update recommendation with analysis ID
        recommendation["analysis_id"] = optimization_result.id
        
        return recommendation