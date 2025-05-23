"""
Configuration settings
"""
# This part is Heavily made with Ai assitance, not used to flask and jwt

import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-should-be-changed'           # Should change before use via enviroment varible
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///cmms.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY ="Testtesttesttesttesttestetstesttest"  # os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'. Had to change to test the jwt at leat 32 charecters
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_COOKIE_CSRF_PROTECT = False  # Disable CSRF protection for testing                         
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')