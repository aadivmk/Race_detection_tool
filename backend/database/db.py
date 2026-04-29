import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'race_conditions.db')


def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            threads_data TEXT NOT NULL,
            resources_data TEXT NOT NULL,
            conflicts TEXT NOT NULL,
            severity TEXT NOT NULL,
            solution TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()


def save_analysis(report_data):
    """Save analysis report to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO analysis_reports 
        (timestamp, threads_data, resources_data, conflicts, severity, solution)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        report_data['timestamp'],
        json.dumps(report_data['threads']),
        json.dumps(report_data['resources']),
        json.dumps(report_data['conflicts']),
        report_data['severity'],
        report_data['solution']  # already a JSON string from controller
    ))

    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return report_id


def get_history():
    """Fetch analysis history"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM analysis_reports ORDER BY created_at DESC LIMIT 50')
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        # Safely parse conflicts JSON (fallback to empty list)
        try:
            conflicts = json.loads(row[4]) if row[4] else []
        except (json.JSONDecodeError, TypeError):
            conflicts = []

        # Safely parse solution JSON (fallback to string)
        try:
            solution = json.loads(row[6]) if row[6] else []
        except (json.JSONDecodeError, TypeError):
            solution = row[6]

        history.append({
            'id': row[0],
            'timestamp': row[1],
            'severity': row[5],
            'conflicts': conflicts,
            'solution': solution,
            'created_at': row[7]
        })
    return history


def delete_report(report_id):
    """Delete specific analysis report"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM analysis_reports WHERE id = ?', (report_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted