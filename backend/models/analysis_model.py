"""
Analysis Model for Race Condition Detection Tool
Handles data models and validation for thread analysis
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
from datetime import datetime
import json

@dataclass
class Thread:
    id: int
    operations: List['Operation'] = field(default_factory=list)

@dataclass
class Operation:
    resource: str
    type: str  # 'read' or 'write'
    time: int = 0

@dataclass
class Resource:
    name: str
    initial_value: float = 0.0

@dataclass
class AnalysisReport:
    id: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    threads: List[Thread] = field(default_factory=list)
    resources: List[Resource] = field(default_factory=list)
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    severity: str = "Safe"
    total_conflicts: int = 0
    affected_resources: List[str] = field(default_factory=list)
    solutions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'threads': [
                {'id': t.id, 'operations': [
                    {'resource': op.resource, 'type': op.type, 'time': op.time}
                    for op in t.operations
                ]}
                for t in self.threads
            ],
            'resources': [
                {'name': r.name, 'initial_value': r.initial_value}
                for r in self.resources
            ],
            'conflicts': self.conflicts,
            'severity': self.severity,
            'total_conflicts': self.total_conflicts,
            'affected_resources': self.affected_resources,
            'solutions': self.solutions
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalysisReport':
        """Create model from dictionary"""
        report = cls()
        report.id = data.get('id', 0)
        report.timestamp = data.get('timestamp', '')
        report.conflicts = data.get('conflicts', [])
        report.severity = data.get('severity', 'Safe')
        report.total_conflicts = data.get('total_conflicts', 0)
        report.affected_resources = data.get('affected_resources', [])
        report.solutions = data.get('solutions', [])
        return report

class AnalysisValidator:
    """Validates analysis input data"""
    
    @staticmethod
    def validate_threads(threads_data: List[Dict]) -> bool:
        """Validate threads input"""
        if not threads_data or len(threads_data) < 2:
            return False
        
        for thread in threads_data:
            if not thread.get('operations') or len(thread['operations']) == 0:
                return False
        
        return True
    
    @staticmethod
    def validate_resources(resources_data: List[Dict]) -> bool:
        """Validate resources input"""
        return bool(resources_data and len(resources_data) > 0)