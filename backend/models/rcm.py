# backend/models/rcm.py
from backend.database import db
from datetime import datetime,timezone


class RCMUnit(db.Model):
    """Model for units/equipment in RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    equipment_id = db.Column(db.Integer, db.ForeignKey('machine.id'))
    technical_id = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    functions = db.relationship('RCMFunction', backref='unit', lazy=True)
    
    def __repr__(self):
        return f'<RCMUnit {self.name}>'

class RCMFunction(db.Model):
    """Model for functions in RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    equipment_id = db.Column(db.Integer, db.ForeignKey('machine.id'))
    technical_id = db.Column(db.String(50))  # For alignment with technical structure
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  #TIMEZONE UTC
    
    # Relationships
    functional_failures = db.relationship('RCMFunctionalFailure', backref='function', lazy=True)
    
    def __repr__(self):
        return f'<RCMFunction {self.name}>'

class RCMFunctionalFailure(db.Model):
    """Model for functional failures in RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    function_id = db.Column(db.Integer, db.ForeignKey('rcm_function.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  #TIMEZONE UTC
    
    # Relationships
    failure_modes = db.relationship('RCMFailureMode', backref='functional_failure', lazy=True)
    
    def __repr__(self):
        return f'<RCMFunctionalFailure {self.name}>'

class RCMFailureMode(db.Model):
    """Model for failure modes in RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    failure_type = db.Column(db.String(100))  # E.g., Electrical, Mechanical, etc.
    detection_method = db.Column(db.String(255))  # How the failure is detected
    functional_failure_id = db.Column(db.Integer, db.ForeignKey('rcm_functional_failure.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  #TIMEZONE UTC
    
    # Relationships
    effects = db.relationship('RCMFailureEffect', backref='failure_mode', lazy=True)
    
    def __repr__(self):
        return f'<RCMFailureMode {self.name}>'

class RCMFailureEffect(db.Model):
    """Model for failure effects in RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(50))  # Low, Medium, High, Critical
    failure_mode_id = db.Column(db.Integer, db.ForeignKey('rcm_failure_mode.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  #TIMEZONE UTC

     # Add fields for consequences 
    safety_impact = db.Column(db.String(50))
    environmental_impact = db.Column(db.String(50))
    operational_impact = db.Column(db.String(50))
    economic_impact = db.Column(db.String(50))
    
    def __repr__(self):
        return f'<RCMFailureEffect {self.id}>'

class RCMMaintenance(db.Model):
    """Model for maintenance actions derived from RCM analysis"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    maintenance_type = db.Column(db.String(100))  # Preventive, Predictive, Corrective
    interval_days = db.Column(db.Integer)  # Frequency in days
    interval_hours = db.Column(db.Float)   # Frequency in equipment hours
    failure_mode_id = db.Column(db.Integer, db.ForeignKey('rcm_failure_mode.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))  #TIMEZONE UTC

    # Added after changes
    maintenance_strategy = db.Column(db.String(100))  # The recommended strategy
    
    def __repr__(self):
        return f'<RCMMaintenance {self.title}>'