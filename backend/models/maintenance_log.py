"""
Maintenance log model
"""
from backend.database import db
from datetime import datetime,timezone

class MaintenanceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime,default=lambda: datetime.now(timezone.utc))  #TIMEZONE UTC
    description = db.Column(db.Text, nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)
    subsystem_id = db.Column(db.Integer, db.ForeignKey('subsystem.id'))
    component_id = db.Column(db.Integer, db.ForeignKey('component.id'))
    performed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    work_order_id = db.Column(db.Integer, db.ForeignKey('work_order.id'))
    maintenance_type = db.Column(db.String(50))  # 'minor', 'major', etc.
    maintenance_category = db.Column(db.String(50))  # 'cleaning', 'inspection', etc.
    hour_counter = db.Column(db.Float)  # Machine hours at time of maintenance, Unsure if needed om every maintance, but logged inn with
    
    # For deviations aka flag indicating if problems were found
    has_deviation = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<MaintenanceLog {self.id} on Machine {self.machine_id}>'