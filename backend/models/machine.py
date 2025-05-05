"""
Machine model
"""
from backend.database import db
from datetime import datetime, timezone

class Machine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    technical_id = db.Column(db.String(20), unique=True)  # e.g., "1077"
    qr_code = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text)
    installation_date = db.Column(db.DateTime)      # Fjernet default
    last_maintenance = db.Column(db.DateTime)
    hour_counter = db.Column(db.Float, default=0)  # For hour-based maintenance NEED TO SEE MORE ON 
    
    # Relationships
    subsystems = db.relationship('Subsystem', backref='machine', lazy=True)
    components = db.relationship('Component', backref='machine', lazy=True)
    work_orders = db.relationship('WorkOrder', backref='machine', lazy=True)
    maintenance_logs = db.relationship('MaintenanceLog', backref='machine', lazy=True)
    
    #String representation
    def __repr__(self):
        return f'<Machine {self.name} ({self.technical_id})>'

class Subsystem(db.Model):
    """Subsystem model - major functional areas of a machine"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    technical_id = db.Column(db.String(20), unique=True)  # e.g., "1077.01"
    description = db.Column(db.Text)
    
    # Foreign key to machine
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)
    
    # Relationships
    components = db.relationship('Component', backref='subsystem', lazy=True)
    work_orders = db.relationship('WorkOrder', backref='subsystem', lazy=True)
    maintenance_logs = db.relationship('MaintenanceLog', backref='subsystem', lazy=True)

    def __repr__(self):
        return f'<Subsystem {self.name} ({self.technical_id}) of Machine {self.machine_id})>'

class Component(db.Model):
    """Component model - individual parts of a subsystem"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    technical_id = db.Column(db.String(20), unique=True)  # e.g., "1077.01.001"
    location = db.Column(db.String(200))
    description = db.Column(db.Text)
    function = db.Column(db.Text)
    installation_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    maintenance_requirements = db.Column(db.Text)
    potential_failures = db.Column(db.Text)
    
    # Foreign keys
    subsystem_id = db.Column(db.Integer, db.ForeignKey('subsystem.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)

    # Relationships
    work_orders = db.relationship('WorkOrder', backref='component', lazy=True)
    maintenance_logs = db.relationship('MaintenanceLog', backref='component', lazy=True)
    
    #String representation
    def __repr__(self):
        return f'<Component {self.name} ({self.technical_id}) in subsytem {self.subsystem_id} of Machine {self.machine_id}>'