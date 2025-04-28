def kaplan_meier_analysis(component_failure_data):
    """
    Perform Kaplan-Meier survival analysis following Jørns course
    
    Parameters:
    component_failure_data - List of tuples (time, is_censored)
    """
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
    """Find the median survival time (when probability = 0.5)"""
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