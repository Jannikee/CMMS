"""
User model
"""
from backend.database import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), nullable=False)  # 'worker', 'supervisor', 'admin'
    
    #hashes set password
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    #Checks password, hash
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    #String representation of the user for debugging
    def __repr__(self):
        return f'<User {self.username}>'