"""
Advanced statistical analysis for maintenance optimization
"""
import numpy as np
import scipy.stats as stats
import math
import logging
from datetime import datetime, timedelta, timezone
from backend.models.maintenance_log import MaintenanceLog
from backend.models.failure import Failure
from backend.models.machine import Machine, Component
from backend.database import db
from backend.services.statistics import MaintenanceStatistics

logger = logging.getLogger(__name__)

class AdvancedStatistics:
    """Advanced statistical methods for maintenance optimization"""
    
    @staticmethod
    def perform_weibull_analysis(component_id, look_back_days=180):
        """
        Perform Weibull analysis on component failure data
        
        Args:
            component_id: ID of the component to analyze
            look_back_days: Number of days of historical data to analyze
            
        Returns:
            Dict containing Weibull parameters and analysis results
        """
        component = Component.query.get(component_id)
        if not component:
            return None
            
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
            
        # If not enough failures, cannot perform Weibull analysis
        if len(failures) < 3:
            return {
                "success": False,
                "message": "Insufficient failure data for Weibull analysis",
                "failure_count": len(failures)
            }
            
        # Calculate operating hours using your existing methods
        machine = Machine.query.get(component.machine_id)
        failure_rates = MaintenanceStatistics.get_failure_rates(machine.id, start_date, end_date)
        
        # Find the failure rate for this machine
        operating_hours = 0
        for rate in failure_rates:
            if rate['id'] == machine.id:
                operating_hours = rate['operation_hours']
                break
                
        if not operating_hours:
            # Use machine hour counter as fallback
            operating_hours = machine.hour_counter or 1000  # Default to 1000 if no data
            
        # Sort failures by timestamp
        sorted_failures = sorted(failures, key=lambda f: f.maintenance_log.timestamp)
        
        # Calculate time-to-failure for each failure
        failure_times = []
        
        # Use first maintenance log as installation date if component has no installation date
        if not component.installation_date:
            first_maintenance = MaintenanceLog.query.filter_by(
                component_id=component_id
            ).order_by(MaintenanceLog.timestamp.asc()).first()
            
            installation_date = first_maintenance.timestamp if first_maintenance else (
                end_date - timedelta(days=look_back_days)
            )
        else:
            installation_date = component.installation_date
            
        # Get all maintenance logs for this component to determine repair dates
        maintenance_logs = MaintenanceLog.query.filter_by(
            component_id=component_id
        ).order_by(MaintenanceLog.timestamp.asc()).all()
        
        # Track the repair dates
        repair_dates = []
        for log in maintenance_logs:
            if not log.has_deviation and log.maintenance_type in [
                'repair', 'replacement', 'overhaul', 'rebuild'
            ]:
                repair_dates.append(log.timestamp)
                
        # Calculate time-to-failure for each failure
        for failure in sorted_failures:
            failure_time = failure.maintenance_log.timestamp
            
            # Find the most recent repair before this failure
            last_repair = installation_date
            for repair_time in repair_dates:
                if repair_time < failure_time:
                    last_repair = repair_time
                else:
                    break
            
            # Calculate time-to-failure in hours
            hours_to_failure = (failure_time - last_repair).total_seconds() / 3600
            
            # Only include valid times
            if hours_to_failure > 0:
                failure_times.append(hours_to_failure)
                
        # If not enough valid failure times, use even spacing
        if len(failure_times) < 2:
            avg_failure_interval = operating_hours / (len(failures) + 1)
            failure_times = [avg_failure_interval * (i+1) for i in range(len(failures))]
            
        try:
            # Use SciPy's Weibull fit
            shape, loc, scale = stats.weibull_min.fit(failure_times, floc=0)
            
            # Calculate R-squared to measure goodness of fit
            cdf_fitted = stats.weibull_min.cdf(sorted(failure_times), shape, loc, scale)
            
            # Calculate empirical CDF values
            n = len(failure_times)
            empirical_cdf = [(i - 0.3) / (n + 0.4) for i in range(1, n + 1)]
            
            # Calculate R-squared
            mean_empirical = sum(empirical_cdf) / len(empirical_cdf)
            ss_total = sum((y - mean_empirical) ** 2 for y in empirical_cdf)
            ss_residual = sum((y - y_hat) ** 2 for y, y_hat in zip(empirical_cdf, cdf_fitted))
            r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
            
            # Calculate MTBF based on Weibull parameters
            # MTBF for Weibull = scale * Gamma(1 + 1/shape)
            from scipy.special import gamma
            mtbf = scale * gamma(1 + 1/shape)
            
            # Calculate optimal maintenance interval for different reliability targets
            def weibull_reliability(t, shape, scale):
                """Calculate reliability (survival probability) at time t"""
                return np.exp(-(t/scale)**shape)
            
            def find_interval_for_reliability(reliability_target, shape, scale):
                """Find the time at which reliability equals the target"""
                return scale * (-np.log(reliability_target))**(1/shape)
            
            # Calculate intervals for different reliability targets
            reliability_intervals = {}
            for reliability in [0.99, 0.95, 0.90, 0.85, 0.80]:
                interval = find_interval_for_reliability(reliability, shape, scale)
                reliability_intervals[f"{int(reliability*100)}%"] = interval
                
            # Save parameters to component
            component.weibull_shape = shape
            component.weibull_scale = scale
            component.weibull_updated = datetime.now(timezone.utc)
            db.session.commit()
            
            return {
                "success": True,
                "shape_parameter": shape,
                "scale_parameter": scale,
                "r_squared": r_squared,
                "mtbf": mtbf,
                "reliability_intervals": reliability_intervals,
                "failure_times": failure_times,
                "failure_count": len(failures),
                "operating_hours": operating_hours
            }
            
        except Exception as e:
            logger.error(f"Weibull analysis error: {str(e)}")
            return {
                "success": False,
                "message": f"Error in Weibull analysis: {str(e)}",
                "failure_count": len(failures)
            }
    
    @staticmethod
    def perform_kaplan_meier_analysis(component_id, look_back_days=180):
        """
        Perform Kaplan-Meier survival analysis on component failure data
        
        Args:
            component_id: ID of the component to analyze
            look_back_days: Number of days of historical data to analyze
            
        Returns:
            Dict containing Kaplan-Meier analysis results
        """
        component = Component.query.get(component_id)
        if not component:
            return None
            
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
            
        # If not enough failures, cannot perform analysis
        if len(failures) < 3:
            return {
                "success": False,
                "message": "Insufficient failure data for Kaplan-Meier analysis",
                "failure_count": len(failures)
            }
            
        # Calculate operating hours using your existing methods
        machine = Machine.query.get(component.machine_id)
        failure_rates = MaintenanceStatistics.get_failure_rates(machine.id, start_date, end_date)
        
        # Find the failure rate for this machine
        operating_hours = 0
        for rate in failure_rates:
            if rate['id'] == machine.id:
                operating_hours = rate['operation_hours']
                break
                
        if not operating_hours:
            # Use machine hour counter as fallback
            operating_hours = machine.hour_counter or 1000  # Default to 1000 if no data
        
        # Get all maintenance logs for this component
        maintenance_logs = MaintenanceLog.query.filter_by(
            component_id=component_id
        ).order_by(MaintenanceLog.timestamp.asc()).all()
        
        # Calculate times for all component instances
        component_data = []
        
        # Use first maintenance log as installation date if component has no installation date
        if not component.installation_date:
            first_maintenance = maintenance_logs[0] if maintenance_logs else None
            installation_date = first_maintenance.timestamp if first_maintenance else (
                end_date - timedelta(days=look_back_days)
            )
        else:
            installation_date = component.installation_date
            
        # Start with installation
        current_start = installation_date
        
        # Process all maintenance logs chronologically
        all_events = [(log.timestamp, log.has_deviation) for log in maintenance_logs]
        all_events.sort(key=lambda x: x[0])
        
        for event_time, is_failure in all_events:
            # Calculate time since last reset
            time_hours = (event_time - current_start).total_seconds() / 3600
            
            # Add to dataset with censoring info
            component_data.append((time_hours, is_failure))
            
            # If this was a failure followed by repair/replacement, reset the clock
            repair_types = ['repair', 'replacement', 'overhaul', 'rebuild']
            if is_failure:
                # Look for repair after this failure
                repair_found = False
                for log in maintenance_logs:
                    if (log.timestamp > event_time and 
                        log.maintenance_type in repair_types and 
                        not log.has_deviation):
                        current_start = log.timestamp
                        repair_found = True
                        break
                
                # If no specific repair found but was a failure, assume repair happened
                if not repair_found:
                    current_start = event_time + timedelta(hours=24)  # Assume repair took 24 hours
        
        # Add final censored observation if still operating
        if current_start < datetime.now(timezone.utc):
            final_time = (datetime.now(timezone.utc) - current_start).total_seconds() / 3600
            component_data.append((final_time, False))  # Censored
        
        try:
            # Sort the data by time
            sorted_data = sorted(component_data, key=lambda x: x[0])
            
            # Extract unique failure times
            unique_times = sorted(set([t for t, is_failure in sorted_data if is_failure]))
            
            # Calculate n(i) and s(i) for each time point
            survival_data = []
            for t in unique_times:
                # n(i) = number of components at risk at time t
                n_i = sum(1 for time, _ in sorted_data if time >= t)
                
                # s(i) = number of failures at time t
                s_i = sum(1 for time, is_failure in sorted_data if time == t and is_failure)
                
                survival_data.append((t, n_i, s_i))
            
            # Calculate survival probabilities using Kaplan-Meier estimator
            survival_prob = 1.0
            survival_curve = [(0, 1.0)]  # Start at time 0 with 100% survival
            
            for t, n_i, s_i in survival_data:
                if n_i > 0:
                    # Calculate (n(i) - s(i))/n(i)
                    step_prob = (n_i - s_i) / n_i
                    
                    # Multiply by previous probability
                    survival_prob *= step_prob
                
                survival_curve.append((t, survival_prob))
            
            # Calculate median survival time (50% reliability)
            median_survival = None
            for i, (t, prob) in enumerate(survival_curve):
                if prob <= 0.5:
                    # Linear interpolation for more accurate median
                    if i > 0:
                        t1, p1 = survival_curve[i-1]
                        t2, p2 = t, prob
                        
                        # Interpolate to find exact median
                        if p1 != p2:  # Avoid division by zero
                            median_survival = t1 + (t2 - t1) * (0.5 - p1) / (p2 - p1)
                        else:
                            median_survival = t1
                    else:
                        median_survival = t
                    break
            
            # Find reliability intervals
            reliability_intervals = {}
            target_reliabilities = [0.99, 0.95, 0.90, 0.85, 0.80]
            
            for target in target_reliabilities:
                for i, (t, prob) in enumerate(survival_curve):
                    if prob <= target:
                        # Linear interpolation
                        if i > 0:
                            t1, p1 = survival_curve[i-1]
                            t2, p2 = t, prob
                            
                            # Interpolate to find exact time
                            if p1 != p2:  # Avoid division by zero
                                reliability_time = t1 + (t2 - t1) * (target - p1) / (p2 - p1)
                            else:
                                reliability_time = t1
                        else:
                            reliability_time = t
                            
                        reliability_intervals[f"{int(target*100)}%"] = reliability_time
                        break
            
            # Save to component
            component.median_survival = median_survival
            component.survival_data = str(survival_curve)  # Convert to string for storage
            component.weibull_updated = datetime.now(timezone.utc)  # Use same field for last update
            db.session.commit()
            
            return {
                "success": True,
                "survival_curve": survival_curve,
                "median_survival": median_survival,
                "reliability_intervals": reliability_intervals,
                "n_events": len(sorted_data),
                "n_failures": sum(1 for _, is_failure in sorted_data if is_failure),
                "failure_count": len(failures),
                "operating_hours": operating_hours
            }
            
        except Exception as e:
            logger.error(f"Kaplan-Meier analysis error: {str(e)}")
            return {
                "success": False,
                "message": f"Error in Kaplan-Meier analysis: {str(e)}",
                "failure_count": len(failures)
            }
"""def kaplan_meier_analysis(component_failure_data):
    
    Perform Kaplan-Meier survival analysis following Jørns course
    
    Parameters:
    component_failure_data - List of tuples (time, is_censored)
    
    import numpy as np
    
    # Sort the data by time
    sorted_data = sorted(component_failure_data, key=lambda x: x[0])
    
    # Extract unique failure times
    unique_times = sorted(set([t for t, _ in sorted_data]))
    
    # Calculate n(i) and s(i) for each time point
    survival_data = []
    for t in unique_times:
        # n(i) = number of components at risk at time t
        n_i = sum(1 for time, _ in sorted_data if time >= t)
        
        # s(i) = number of failures at time t
        s_i = sum(1 for time, is_censored in sorted_data if time == t and not is_censored)
        
        survival_data.append((t, n_i, s_i))
    
    # Calculate survival probabilities using the formula
    survival_prob = 1.0
    result = []
    
    for t, n_i, s_i in survival_data:
        if n_i > 0:
            # Calculate (n(i) - s(i))/n(i)
            step_prob = (n_i - s_i) / n_i
            
            # Multiply by previous probability
            survival_prob *= step_prob
        
        result.append((t, survival_prob))
    
    # Extract times and probabilities for plotting
    times = [r[0] for r in result]
    probabilities = [r[1] for r in result]
    
    return {
        'times': times,
        'survival_probabilities': probabilities,
        'median_survival': find_median_survival(times, probabilities)
    }

def find_median_survival(times, probabilities):
    #Find the median survival time (when probability = 0.5)
    import numpy as np
    
    # Find where survival probability crosses 0.5
    for i, prob in enumerate(probabilities):
        if prob <= 0.5:
            # Linear interpolation for more accurate median
            if i > 0:
                t1, p1 = times[i-1], probabilities[i-1]
                t2, p2 = times[i], prob
                
                # Interpolate to find exact median
                median = t1 + (t2 - t1) * (0.5 - p1) / (p2 - p1)
                return median
            
            return times[i]
    
    # If probability never drops below 0.5, return None
    return None
    """