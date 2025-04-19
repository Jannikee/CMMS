import sys
print("Python path:", sys.executable)

try:
    import flask_sqlalchemy
    print("flask_sqlalchemy is installed here!")
except ImportError:
    print("flask_sqlalchemy NOT found in this environment")


#put the python path as interperter