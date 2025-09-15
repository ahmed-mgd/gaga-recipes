# backend/app.py

from flask import Flask, jsonify
from flask_cors import CORS

# Configuration
DEBUG = True

# Instantiate the app
app = Flask(__name__)
app.config.from_object(__name__)

# Enable CORS
CORS(app, resources={r'/api/*': {'origins': '*'}})

# A simple route
@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({
        'message': 'Hello from the Flask backend!'
    })

if __name__ == '__main__':
    app.run()