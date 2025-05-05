"""
 
"""
#Imports all the core components that will be initialized in the create_app() function
# This part is Heavily made with Ai assitance, as I am not so comfortable with flask 
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.database import db
from backend.config import Config
from backend.api.rcm import rcm_bp

def create_app(config_class=Config):
    
    app = Flask(__name__)
    app.config.from_object(config_class)

    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    CORS(app)

    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints, Blueprints are Flask's way of organizing related routes and functionality
    from backend.api.auth import auth_bp
    from backend.api.work_orders import work_orders_bp
    from backend.api.machines import machines_bp
    from backend.api.maintenance import maintenance_bp
    from backend.api.reports import reports_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(work_orders_bp, url_prefix='/api/work-orders')
    app.register_blueprint(machines_bp, url_prefix='/api/machines')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(rcm_bp, url_prefix='/api/rcm')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    #add jwt callbacks
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        print(f"JWT Verification Failed: {error_string}")
        return jsonify({"message": "Token verification failed"}), 422
    
   
    
    # Create database tables
    with app.app_context():
        from backend.models.user import User
        from backend.models.machine import Machine, Subsystem, Component
        from backend.models.work_order import WorkOrder
        from backend.models.maintenance_log import MaintenanceLog
        from backend.models.failure import Failure, FailureImage
        from backend.models.rcm import RCMUnit, RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
        
        try:
            db.create_all()
            print("Database tables created successfully!")
        except Exception as e:
            print(f"Error creating database tables: {e}")
    """
        # Create database tables
    with app.app_context():
        db.create_all()
    """
    return app

    