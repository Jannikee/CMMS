"""
Models for maintenance optimization settings
"""
from backend.database import db
from datetime import datetime, timezone

class IntervalAdjustmentHistory(db.Model):
    """Track history of maintenance interval adjustments"""
    id = db.Column(db.Integer, primary_key=True)
    maintenance_id = db.Column(db.Integer, db.ForeignKey('rcm_maintenance.id'), nullable=False)
    old_interval_hours = db.Column(db.Float)
    old_interval_days = db.Column(db.Integer)
    new_interval_hours = db.Column(db.Float)
    new_interval_days = db.Column(db.Integer)
    reason = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    automated = db.Column(db.Boolean, default=True)
    
    # Relationships
    maintenance = db.relationship('RCMMaintenance', backref='adjustments')
    user = db.relationship('User')

class MaintenanceSettings(db.Model):
    """Configuration for maintenance interval adjustments"""
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('component.id'))
    maintenance_id = db.Column(db.Integer, db.ForeignKey('rcm_maintenance.id'))
    
    # Analysis method preference
    analysis_method = db.Column(db.String(20), default='weibull')  # 'weibull' or 'kaplan_meier'
    
    # Thresholds for adjustments
    min_interval_hours = db.Column(db.Float)
    max_interval_hours = db.Column(db.Float)
    min_interval_days = db.Column(db.Integer)
    max_interval_days = db.Column(db.Integer)
    
    # Adjustment factors
    max_increase_percent = db.Column(db.Float, default=25.0)  # 25%
    max_decrease_percent = db.Column(db.Float, default=30.0)  # 30%
    
    # Target reliability (0.0 to 1.0)
    reliability_target = db.Column(db.Float, default=0.9)  # 90% reliability
    
    # Controls for automatic adjustment
    auto_adjust_enabled = db.Column(db.Boolean, default=False)
    require_approval = db.Column(db.Boolean, default=True)
    min_confidence = db.Column(db.Float, default=0.7)  # Minimum confidence level for auto-approval
    
    # Additional settings
    last_updated = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # Relationships
    component = db.relationship('Component', backref='maintenance_settings')
    maintenance = db.relationship('RCMMaintenance', backref='settings')
    user = db.relationship('User')

class OptimizationResult(db.Model):
    """Store results of maintenance interval optimization analyses"""
    id = db.Column(db.Integer, primary_key=True)
    component_id = db.Column(db.Integer, db.ForeignKey('component.id'), nullable=False)
    analysis_timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Analysis method used
    analysis_method = db.Column(db.String(20), default='weibull')
    
    # Analysis period
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Analysis data
    failure_count = db.Column(db.Integer)
    maintenance_count = db.Column(db.Integer)
    operating_hours = db.Column(db.Float)
    
    # Weibull parameters (if applicable)
    weibull_shape = db.Column(db.Float)
    weibull_scale = db.Column(db.Float)
    weibull_r_squared = db.Column(db.Float)
    
    # Kaplan-Meier parameters (if applicable)
    median_survival = db.Column(db.Float)
    
    # Statistical results
    failures_per_unit = db.Column(db.Float)  # e.g., per 100 hours
    mtbf = db.Column(db.Float)  # Mean Time Between Failures
    
    # Recommendation details
    needs_adjustment = db.Column(db.Boolean, default=False)
    confidence = db.Column(db.Float)  # 0.0 to 1.0
    recommendation_details = db.Column(db.Text)  # JSON string with detailed recommendations
    
    # Status
    applied = db.Column(db.Boolean, default=False)
    applied_timestamp = db.Column(db.DateTime)
    applied_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # Relationships
    component = db.relationship('Component', backref='optimization_results')
    user = db.relationship('User')