"""
Failure/deviation model
"""
from backend.database import db
from datetime import datetime,timezone

class Failure(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    maintenance_log_id = db.Column(db.Integer, db.ForeignKey('maintenance_log.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # 'minor', 'major', 'critical'
    images = db.relationship('FailureImage', backref='failure', lazy=True)
    resolution = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Failure {self.id} in Log {self.maintenance_log_id}>'

class FailureImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    failure_id = db.Column(db.Integer, db.ForeignKey('failure.id'), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))  #TIMEZONE UTC
    
    def __repr__(self):
        return f'<FailureImage {self.id} for Failure {self.failure_id}>'