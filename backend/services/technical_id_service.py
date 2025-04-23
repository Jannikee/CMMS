"""
Technical ID management service
"""
import re
from backend.models.machine import Machine, Subsystem, Component
from backend.database import db

class TechnicalIDService:
    # ID patterns
    MACHINE_ID_PATTERN = re.compile(r'^\d+$')
    SUBSYSTEM_ID_PATTERN = re.compile(r'^\d+\.\d+$')
    COMPONENT_ID_PATTERN = re.compile(r'^\d+\.\d+\.\d+$')
    
    @staticmethod
    def validate_id(technical_id, level,parent_id=None):
        """
        Validate a technical ID format
        
        Parameters:
        technical_id - The ID to validate
        level - 'machine', 'subsystem', or 'component'
        parent_id - Parent technical ID (for subsystems/components)
        
        Returns:
        (is_valid, error_message)
        """
        if not technical_id:
            return False, "Technical ID is required"
            
        if level == 'machine':
            if not TechnicalIDService.MACHINE_ID_PATTERN.match(technical_id):
                return False, "Machine technical ID must be numeric (e.g., '1077')"
            return True, None
            
        elif level == 'subsystem':
            if not TechnicalIDService.SUBSYSTEM_ID_PATTERN.match(technical_id):
                return False, "Subsystem technical ID must be in format 'number.number' (e.g., '1077.01')"
            return True, None
            
        elif level == 'component':
            if not TechnicalIDService.COMPONENT_ID_PATTERN.match(technical_id):
                return False, "Component technical ID must be in format 'number.number.number' (e.g., '1077.01.001')"
            return True, None
            
        return False, "Invalid level specified"
    
    @staticmethod
    def validate_hierarchy(technical_id, level, parent_id=None):
        """
        Validate that a technical ID follows the hierarchical pattern
        
        Parameters:
        technical_id - The ID to validate
        level - 'machine', 'subsystem', or 'component'
        parent_id - Parent technical ID
        
        Returns:
        (is_valid, error_message)
        """
        # First validate the format
        is_valid, error_message = TechnicalIDService.validate_id(technical_id, level)
        if not is_valid:
            return is_valid, error_message
            
        # Then validate hierarchy if parent_id is provided
        if parent_id:
            if level == 'subsystem':
                machine_id = parent_id
                if not technical_id.startswith(f"{machine_id}."):
                    return False, f"Subsystem technical ID must start with parent machine ID: {machine_id}."
                    
            elif level == 'component':
                subsystem_id = parent_id
                if not technical_id.startswith(f"{subsystem_id}."):
                    return False, f"Component technical ID must start with parent subsystem ID: {subsystem_id}."
        
        return True, None
    
    @staticmethod
    def parse_id(technical_id):
        """
        Parse a technical ID to determine its level and extract parent IDs
        
        Parameters:
        technical_id - The ID to parse
        
        Returns:
        {
            'level': 'machine'|'subsystem'|'component',
            'machine_id': str,
            'subsystem_id': str,
            'component_id': str
        }
        """
        result = {
            'level': None,
            'machine_id': None,
            'subsystem_id': None,
            'component_id': None
        }
        
        if TechnicalIDService.MACHINE_ID_PATTERN.match(technical_id):
            result['level'] = 'machine'
            result['machine_id'] = technical_id
            
        elif TechnicalIDService.SUBSYSTEM_ID_PATTERN.match(technical_id):
            result['level'] = 'subsystem'
            parts = technical_id.split('.')
            result['machine_id'] = parts[0]
            result['subsystem_id'] = technical_id
            
        elif TechnicalIDService.COMPONENT_ID_PATTERN.match(technical_id):
            result['level'] = 'component'
            parts = technical_id.split('.')
            result['machine_id'] = parts[0]
            result['subsystem_id'] = f"{parts[0]}.{parts[1]}"
            result['component_id'] = technical_id
            
        return result
    
    @staticmethod
    def get_next_available_id(parent_id=None, level='machine'):
        """
        Get the next available technical ID in sequence
        
        Parameters:
        parent_id - Parent technical ID (for subsystems/components)
        level - Level to generate ID for
        
        Returns:
        Next available ID
        """
        if level == 'machine':
            # Find highest machine ID and increment
            highest = db.session.query(db.func.max(Machine.technical_id)).scalar()
            if highest:
                return str(int(highest) + 1)
            else:
                return "1000"  # Start with 1000
                
        elif level == 'subsystem':
            # Find highest subsystem ID for this machine
            if not parent_id:
                return None
                
            # Query subsystems with this machine ID prefix
            highest = db.session.query(
                db.func.max(Subsystem.technical_id)
            ).filter(
                Subsystem.technical_id.like(f"{parent_id}.%")
            ).scalar()
            
            if highest:
                # Extract the subsystem number and increment
                parts = highest.split('.')
                return f"{parent_id}.{int(parts[1]) + 1:02d}"
            else:
                return f"{parent_id}.01"  # Start with 01
                
        elif level == 'component':
            # Find highest component ID for this subsystem
            if not parent_id:
                return None
                
            # Query components with this subsystem ID prefix
            highest = db.session.query(
                db.func.max(Component.technical_id)
            ).filter(
                Component.technical_id.like(f"{parent_id}.%")
            ).scalar()
            
            if highest:
                # Extract the component number and increment
                parts = highest.split('.')
                return f"{parent_id}.{int(parts[2]) + 1:03d}"
            else:
                return f"{parent_id}.001"  # Start with 001
                
        return None