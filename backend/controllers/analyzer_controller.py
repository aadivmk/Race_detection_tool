from flask import jsonify, request
from utils.race_detector import detect_race_conditions
from database.db import save_analysis, get_history, delete_report
import json


def analyze_race_condition():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data sent to server'}), 400

        threads = data.get('threads', [])
        resources = data.get('resources', [])

        result = detect_race_conditions({"threads": threads, "resources": resources})

        # Save to database
        save_analysis({
            'timestamp': result['timestamp'],
            'threads': threads,
            'resources': resources,
            'conflicts': result['result']['conflicts'],
            'severity': result['result']['severity'],
            'solution': json.dumps(result['solutions'])
        })

        return jsonify(result), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Backend Error: {str(e)}"}), 500


def get_analysis_history():
    try:
        history = get_history()
        return jsonify(history), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Backend Error: {str(e)}"}), 500


def delete_analysis_report(report_id):
    try:
        deleted = delete_report(report_id)
        if deleted:
            return jsonify({'message': 'Report deleted successfully'}), 200
        else:
            return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Backend Error: {str(e)}"}), 500


def get_solutions():
    """Return static solutions reference page data"""
    solutions = [
        {
            'name': 'Mutex Lock',
            'description': 'Mutual exclusion locks ensure only one thread accesses critical section at a time.',
            'use_case': 'Simple shared variable protection',
            'example': 'pthread_mutex_lock(&mutex);\nbalance += amount;\npthread_mutex_unlock(&mutex);'
        },
        {
            'name': 'Semaphore',
            'description': 'Generalized locks for counting resources.',
            'use_case': 'Resource pools and producer-consumer patterns',
            'example': 'sem_wait(&semaphore);\ncritical_section();\nsem_post(&semaphore);'
        },
        {
            'name': 'Read-Write Lock',
            'description': 'Multiple readers allowed simultaneously, single writer.',
            'use_case': 'Read-heavy workloads',
            'example': 'pthread_rwlock_rdlock(&rwlock);\n// read data\npthread_rwlock_unlock(&rwlock);'
        },
        {
            'name': 'Atomic Operations',
            'description': 'Lock-free operations for simple updates. Hardware-supported.',
            'use_case': 'Simple counter or flag updates',
            'example': '__atomic_fetch_add(&balance, amount, __ATOMIC_SEQ_CST);'
        }
    ]
    return jsonify(solutions), 200