# backend/services/import_service.py
import pandas as pd
import openpyxl
from backend.models.rcm import RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.database import db

class RCMImportService:
    @staticmethod
    def import_rcm_excel(file_path, equipment_id):
        """Import RCM analysis from Excel file"""
        try:
            # Read Excel file
            df = pd.read_excel(file_path, sheet_name=0)
            
            # Check if required columns exist
            required_columns = ['Funksjon', 'Funksjonsfeil', 'Sviktmode', 'Effekt']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
            
            # Track created objects to link them correctly
            functions_map = {}  # name -> object
            failures_map = {}   # (function_id, name) -> object
            modes_map = {}      # (failure_id, name) -> object
            
            # Process each row
            for _, row in df.iterrows():
                function_name = row.get('Funksjon')
                failure_name = row.get('Funksjonsfeil')
                mode_name = row.get('Sviktmode')
                effect_desc = row.get('Effekt')
                
                if not function_name or not failure_name or not mode_name:
                    continue  # Skip incomplete rows
                
                # Process function
                if function_name not in functions_map:
                    function = RCMFunction(
                        name=function_name,
                        description=row.get('Funksjonsbeskrivelse', ''),
                        equipment_id=equipment_id
                    )
                    db.session.add(function)
                    db.session.flush()  # Get ID without committing
                    functions_map[function_name] = function
                else:
                    function = functions_map[function_name]
                
                # Process functional failure
                failure_key = (function.id, failure_name)
                if failure_key not in failures_map:
                    failure = RCMFunctionalFailure(
                        name=failure_name,
                        description=row.get('Feilbeskrivelse', ''),
                        function_id=function.id
                    )
                    db.session.add(failure)
                    db.session.flush()
                    failures_map[failure_key] = failure
                else:
                    failure = failures_map[failure_key]
                
                # Process failure mode
                mode_key = (failure.id, mode_name)
                if mode_key not in modes_map:
                    mode = RCMFailureMode(
                        name=mode_name,
                        description=row.get('Sviktmodebeskrivelse', ''),
                        failure_type=row.get('Type', ''),
                        detection_method=row.get('Deteksjonsmetode', ''),
                        functional_failure_id=failure.id
                    )
                    db.session.add(mode)
                    db.session.flush()
                    modes_map[mode_key] = mode
                else:
                    mode = modes_map[mode_key]
                
                # Add failure effect
                if effect_desc:
                    effect = RCMFailureEffect(
                        description=effect_desc,
                        severity=row.get('Konsekvens', 'Medium'),
                        failure_mode_id=mode.id
                    )
                    db.session.add(effect)
                
                # Add maintenance action if specified
                maintenance_title = row.get('Tiltak')
                if maintenance_title:
                    maintenance = RCMMaintenance(
                        title=maintenance_title,
                        description=row.get('Tiltaksbeskrivelse', ''),
                        maintenance_type=row.get('Vedlikeholdstype', 'preventive'),
                        interval_days=row.get('Intervall_dager'),
                        interval_hours=row.get('Intervall_timer'),
                        failure_mode_id=mode.id
                    )
                    db.session.add(maintenance)
            
            # Commit all changes
            db.session.commit()
            
            return {
                'functions': len(functions_map),
                'failures': len(failures_map),
                'modes': len(modes_map)
            }
            
        except Exception as e:
            db.session.rollback()
            raise e
        
def import_hierarchy_from_excel(file_path):
    """Import machine hierarchy from Excel file"""
    import pandas as pd
    from backend.models.machine import Machine, Subsystem, Component
    from backend.database import db
    from backend.services.technical_id_service import TechnicalIDService
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Expected columns
        required_columns = ['technical_id', 'name', 'type', 'description']
        for col in required_columns:
            if col not in df.columns:
                return {'success': False, 'message': f"Missing required column: {col}"}
        
        # Process rows
        machines_created = 0
        subsystems_created = 0
        components_created = 0
        
        # First pass - create all entries
        for _, row in df.iterrows():
            technical_id = str(row['technical_id']).strip()
            name = row['name']
            entity_type = row['type'].lower()  # 'machine', 'subsystem', 'component'
            description = row.get('description', '')
            
            # Parse the technical ID
            id_info = TechnicalIDService.parse_id(technical_id)
            
            if not id_info['level']:
                continue  # Invalid ID format
            
            if id_info['level'] != entity_type:
                continue  # ID format doesn't match declared type
            
            # Check if entity already exists
            if entity_type == 'machine':
                if Machine.query.filter_by(technical_id=technical_id).first():
                    continue  # Already exists
                
                # Create new machine
                machine = Machine(
                    name=name,
                    technical_id=technical_id,
                    description=description,
                    location=row.get('location', ''),
                    qr_code=str(uuid.uuid4())  # Generate a unique QR code
                )
                db.session.add(machine)
                machines_created += 1
                
            elif entity_type == 'subsystem':
                if Subsystem.query.filter_by(technical_id=technical_id).first():
                    continue  # Already exists
                
                # Find parent machine
                machine = Machine.query.filter_by(technical_id=id_info['machine_id']).first()
                if not machine:
                    continue  # Parent doesn't exist
                
                # Create new subsystem
                subsystem = Subsystem(
                    name=name,
                    technical_id=technical_id,
                    description=description,
                    machine_id=machine.id
                )
                db.session.add(subsystem)
                subsystems_created += 1
                
            elif entity_type == 'component':
                if Component.query.filter_by(technical_id=technical_id).first():
                    continue  # Already exists
                
                # Find parent subsystem
                subsystem = Subsystem.query.filter_by(technical_id=id_info['subsystem_id']).first()
                if not subsystem:
                    continue  # Parent doesn't exist
                
                # Find machine
                machine = Machine.query.filter_by(technical_id=id_info['machine_id']).first()
                if not machine:
                    continue  # Machine doesn't exist
                
                # Create new component
                component = Component(
                    name=name,
                    technical_id=technical_id,
                    description=description,
                    location=row.get('location', ''),
                    function=row.get('function', ''),
                    maintenance_requirements=row.get('maintenance_requirements', ''),
                    potential_failures=row.get('potential_failures', ''),
                    subsystem_id=subsystem.id,
                    machine_id=machine.id
                )
                db.session.add(component)
                components_created += 1
        
        # Commit all changes
        db.session.commit()
        
        return {
            'success': True,
            'message': f"Successfully imported {machines_created} machines, {subsystems_created} subsystems, and {components_created} components",
            'machines_created': machines_created,
            'subsystems_created': subsystems_created, 
            'components_created': components_created
        }
        
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'message': f"Import failed: {str(e)}"}