"""
Main server file
"""
from backend import create_app
from flask import jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import signal
import sys
import os
import atexit

app = create_app()

# Track any child processes we spawn
child_processes = []

# Handle process cleanup on exit
def cleanup_processes():
    for pid in child_processes:
        try:
            os.kill(pid, signal.SIGTERM)
        except:
            pass
    print("All processes cleaned up")

# Handle CTRL+C gracefully
def signal_handler(sig, frame):
    print("\nShutting down the server...")
    cleanup_processes()
    sys.exit(0)

if __name__ == '__main__':
    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Register exit handler to clean up processes
    atexit.register(cleanup_processes)
    
    # Get current process ID
    print(f"Main server process ID: {os.getpid()}")
    
    # Only run the app once, with all configurations here
    app.run(
        host='0.0.0.0', 
        port=5000, 
        debug=True, 
        use_reloader=False,
        threaded=False  # Disable threading to avoid orphan processes
    )