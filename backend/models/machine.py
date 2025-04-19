"""
Machine model
"""
from backend.database import db
from datetime import datetime

class Machine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    qr_code = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text)
    installation_date = db.Column(db.DateTime)      # Fjernet default
    last_maintenance = db.Column(db.DateTime)
    hour_counter = db.Column(db.Float, default=0)  # For hour-based maintenance NEED TO SEE MORE ON 
    
    # Relationships
    components = db.relationship('Component', backref='machine', lazy=True)
    work_orders = db.relationship('WorkOrder', backref='machine', lazy=True)
    maintenance_logs = db.relationship('MaintenanceLog', backref='machine', lazy=True)
    
    #String representation
    def __repr__(self):
        return f'<Machine {self.name}>'

class Component(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)
    location = db.Column(db.String(200))
    function = db.Column(db.Text)
    maintenance_requirements = db.Column(db.Text)       # ønsker jeg å ha dette som en liste?
    potential_failures = db.Column(db.Text)
    
    #String representation
    def __repr__(self):
        return f'<Component {self.name} of Machine {self.machine_id}>'