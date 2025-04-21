"""
Authentication routes
"""
# This part is Heavily made with toturial, as I am not so comfortable with flask 
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.models.user import User
from backend.database import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token, role=user.role, username=user.username), 200
    return jsonify(message="Invalid credentials"), 401

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'worker')       #Other roles included? admin and supervisor?
    
    if User.query.filter_by(username=username).first():
        return jsonify(message="Username already exists"), 400
    if User.query.filter_by(email=email).first():
        return jsonify(message="Email already exists"), 400
    
    user = User(username=username, email=email, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(message="User registered successfully"), 201