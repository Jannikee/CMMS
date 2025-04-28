"""
Main server file
"""
from backend import create_app
from flask import jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
s

app = create_app()
app.run(host='0.0.0.0', port=5000, debug=True)


@app.route('/')
def home():
    return "<h1>Neimen hei!</h1><p>! Velkommen til CMMS API server. Bruk /api/... endpoints to interact with the system.</p>"


if __name__ == '__main__':
    app.run(debug=True)