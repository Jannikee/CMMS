"""
Main server file
"""
from backend import create_app
from flask import jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity


app = create_app()


@app.route('/')
def home():
    return "<h1>Neimen hei!</h1><p>! Velkommen til CMMS API server. Bruk /api/... endpoints to interact with the system.</p>"


if __name__ == '__main__':
    app.run(debug=True)