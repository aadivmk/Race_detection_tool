from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from routes.analyzer_routes import analyzer_bp
from database.db import init_db

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize database
init_db()

# Register blueprints
app.register_blueprint(analyzer_bp, url_prefix='/api')

@app.route('/')
def home():
    return jsonify({
        "message": "Race Condition Detection Tool API",
        "status": "running",
        "endpoints": {
            "analyze": "POST /api/analyze",
            "history": "GET /api/history",
            "solutions": "GET /api/solutions"
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)