from flask import Blueprint, request
from controllers.analyzer_controller import (
    analyze_race_condition, 
    get_analysis_history, 
    delete_analysis_report,
    get_solutions
)

analyzer_bp = Blueprint('analyzer', __name__)

@analyzer_bp.route('/analyze', methods=['POST'])
def analyze():
    return analyze_race_condition()

@analyzer_bp.route('/history', methods=['GET'])
def history():
    return get_analysis_history()

@analyzer_bp.route('/history/<int:report_id>', methods=['DELETE'])
def delete_history(report_id):
    return delete_analysis_report(report_id)

@analyzer_bp.route('/solutions', methods=['GET'])
def solutions():
    return get_solutions()