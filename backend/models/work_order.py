"""
Work order model
"""
from backend.database import db
from datetime import datetime,timezone

class WorkOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))  # Vil jeg ha tidzone UTC?
    due_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='open')  # 'open', 'in_progress', 'completed'
    priority = db.Column(db.String(20), default='normal')  # 'low', 'normal', 'high', 'critical'
    downtime_hours = db.Column(db.Float, default=0)  # Downtime caused by this work order
    type = db.Column(db.String(20), nullable=False)  # 'preventive', 'predictive', 'corrective' skal ikke være synlig på mobile app?
    category = db.Column(db.String(50))  # 'cleaning', 'inspection', 'lubrication', etc.
    
    # Foreign keys 
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)  # which machine needs work   
    subsystem_id = db.Column(db.Integer, db.ForeignKey('subsystem.id'))                # which subsystem needs work
    component_id = db.Column(db.Integer, db.ForeignKey('component.id'))              # which component needs work
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'))                   # Who should do the work....Not needed, only who did the work
    
    # Relationships
    tool_requirements = db.Column(db.Text)
    reason = db.Column(db.Text)  # Why this work order was created
    generation_source = db.Column(db.String(50))  # How the work order was created 'hour_counter', 'calendar', 'deviation', 'rcm'
    
    def __repr__(self):
        return f'<WorkOrder {self.id}: {self.title}>'