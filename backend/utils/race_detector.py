from collections import defaultdict
from datetime import datetime

class RaceConditionDetector:
    def __init__(self):
        self.conflicts = []
        self.severity = "Safe"
    
    def analyze(self, threads, resources):
        self.conflicts = []
        conflict_map = defaultdict(list)
        
        # Ensure resources is a list of strings for simplicity
        # (Converting object format to list of strings if needed)
        res_names = []
        for r in resources:
            if isinstance(r, dict): res_names.append(r.get('name', ''))
            else: res_names.append(str(r))
            
        for t1_idx, thread1 in enumerate(threads):
            for op1 in thread1.get('operations', []):
                for t2_idx, thread2 in enumerate(threads):
                    if t1_idx >= t2_idx: continue
                    
                    for op2 in thread2.get('operations', []):
                        # Force string comparison to avoid index errors
                        r1 = str(op1.get('resource', ''))
                        r2 = str(op2.get('resource', ''))
                        
                        if r1 == r2 and r1 != '':
                            if op1.get('type') == 'write' or op2.get('type') == 'write':
                                self.conflicts.append({
                                    'thread1': f"T{t1_idx+1}",
                                    'thread2': f"T{t2_idx+1}",
                                    'resource': r1,
                                    'op1_type': op1.get('type'),
                                    'op2_type': op2.get('type')
                                })
        
        self.severity = "High" if len(self.conflicts) > 0 else "Safe"
        return {
            'conflicts': self.conflicts,
            'severity': self.severity,
            'total_conflicts': len(self.conflicts),
            'affected_resources': list(set([c['resource'] for c in self.conflicts]))
        }

    def get_solutions(self, result):
        if result['severity'] == "Safe": return ["No issues detected."]
        return ["Use Mutex Lock", "Use Semaphore", "Atomic Operations"]

def detect_race_conditions(data):
    # This is the entry point. 'data' is the JSON from JS.
    threads = data.get('threads', [])
    resources = data.get('resources', [])
    
    detector = RaceConditionDetector()
    result = detector.analyze(threads, resources)
    
    return {
        'timestamp': datetime.now().isoformat(),
        'result': result,
        'solutions': detector.get_solutions(result)
    }