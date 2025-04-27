# backend/services/import_service.py
import pandas as pd
import openpyxl
from backend.models.rcm import RCMUnit, RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.database import db

class RCMImportService:
    @staticmethod
    def import_from_excel(file_path, equipment_id):
        """Import RCM analysis from Excel file matching the layout in the images"""
        try:
            # Read Excel file
            df = pd.read_excel(file_path, sheet_name=0)
            
            # Check if required columns exist - adjust to match your Excel layout
            required_columns = [
                'Funksjon/Function', 
                'Functional Failure/Funksjonsfeil', 
                'Failure Mode/ Sviktmode', 
                'Failure Effect/ Effekt',
                'Enhet'  # Added Enhet (Unit) column
            ]
            
            # Map column names to handle slight variations
            column_mapping = {
                'Funksjon': 'Funksjon/Function',
                'Funksjonsfeil': 'Functional Failure/Funksjonsfeil',
                'Sviktmode': 'Failure Mode/ Sviktmode',
                'Effekt': 'Failure Effect/ Effekt',
                'Konsekvens': 'Konsekvens',
                'Tiltak': 'Tiltak',
                'Tittak og intervall': 'Tittak og intervall',
                'Intervall_dager': 'Intervall_dager',
                'Intervall_timer': 'Intervall_timer',
                'Vedlikeholdstype': 'Vedlikeholdstype',
                'Enhet': 'Enhet',  # Ensure we map "Enhet" column variations
                'Unit': 'Enhet'     # Map English "Unit" to "Enhet"
            }
            
            # Rename columns to standardized names if needed
            for old_name, new_name in column_mapping.items():
                if old_name in df.columns and new_name not in df.columns:
                    df = df.rename(columns={old_name: new_name})
            
            # Check for missing required columns
            missing_columns = [col for col in required_columns if not any(c.startswith(col) for c in df.columns)]
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
            
            # Track created objects to link them correctly
            units_map = {}       # name -> object
            functions_map = {}  # name -> object
            failures_map = {}   # (function_id, name) -> object
            modes_map = {}      # (failure_id, name) -> object
            
            # Process each row
            current_unit = None
            current_function = None
            current_failure = None
            
            imported = {
                'unit': 0,
                'functions': 0,
                'failures': 0,
                'modes': 0,
                'effects': 0,
                'maintenance_actions': 0
            }
            
            for _, row in df.iterrows():
                # Get unit - find the correct column name
                unit_col = next((c for c in df.columns if c.startswith('Enhet')),None)
                unit_name = row.get(unit_col)

                # Get function - find the correct column name
                function_col = next((c for c in df.columns if c.startswith('Funksjon')), None)
                function_name = row.get(function_col)
                
                # Get failure - find the correct column name
                failure_col = next((c for c in df.columns if c.startswith('Functional Failure') or c.startswith('Funksjonsfeil')), None)
                failure_name = row.get(failure_col)
                
                # Get mode - find the correct column name
                mode_col = next((c for c in df.columns if c.startswith('Failure Mode') or c.startswith('Sviktmode')), None)
                mode_name = row.get(mode_col)
                
                # Get effect - find the correct column name
                effect_col = next((c for c in df.columns if c.startswith('Failure Effect') or c.startswith('Effekt')), None)
                effect_desc = row.get(effect_col)
                
                # Get Enhet (Unit) - find the correct column name
                enhet_col = next((c for c in df.columns if c == 'Enhet' or c == 'Unit'), None)
                enhet = row.get(enhet_col) if enhet_col else None
                
                # Skip rows with missing essential data
                if pd.isna(function_name) and pd.isna(failure_name) and pd.isna(mode_name) and pd.isna(effect_desc):
                    continue
                # Handle Unit
                if not pd.isna(unit_name) and unit_name:
                    if unit_name not in units_map:
                        unit = RCMUnit(
                            name=unit_name,
                            description=f"Unit imported from Excel: {unit_name}",
                            equipment_id=equipment_id,
                            technical_id=row.get('Technical ID Unit', '')
                        )
                        db.session.add(unit)
                        db.session.flush()  # Get ID without committing
                        units_map[unit_name] = unit
                        imported['units'] += 1
                    
                    current_unit = units_map[unit_name]
                        
                # Handle function - must have unit
                if not pd.isna(function_name) and function_name and current_unit:
                    if function_name not in functions_map:
                        function = RCMFunction(
                            name=function_name,
                            description=row.get('Funksjonsbeskrivelse', ''),
                            equipment_id=equipment_id,
                            technical_id=row.get('Technical ID', ''),
                            unit=enhet  # Store the unit/enhet value
                        )
                        db.session.add(function)
                        db.session.flush()  # Get ID without committing
                        functions_map[function_name] = function
                        imported['functions'] += 1
                    
                    current_function = functions_map[function_name]
                
                # Skip if no current function
                if not current_function:
                    continue
                
                # Handle functional failure
                if not pd.isna(failure_name) and failure_name:
                    failure_key = (current_function.id, failure_name)
                    if failure_key not in failures_map:
                        failure = RCMFunctionalFailure(
                            name=failure_name,
                            description=row.get('Feilbeskrivelse', ''),
                            function_id=current_function.id
                        )
                        db.session.add(failure)
                        db.session.flush()
                        failures_map[failure_key] = failure
                        imported['failures'] += 1
                    
                    current_failure = failures_map[failure_key]
                
                # Skip if no current failure
                if not current_failure:
                    continue
                
                # Handle failure mode
                if not pd.isna(mode_name) and mode_name:
                    mode_key = (current_failure.id, mode_name)
                    
                    if mode_key not in modes_map:
                        detection_method = None
                        for col in df.columns:
                            if 'detection' in col.lower() or 'measure' in col.lower():
                                detection_method = row.get(col)
                                break
                        
                        mode = RCMFailureMode(
                            name=mode_name,
                            description=row.get('Sviktmodebeskrivelse', ''),
                            failure_type=row.get('Type', ''),
                            detection_method=detection_method,
                            functional_failure_id=current_failure.id
                        )
                        db.session.add(mode)
                        db.session.flush()
                        modes_map[mode_key] = mode
                        imported['modes'] += 1
                    
                    current_mode = modes_map[mode_key]
                    
                    # Handle failure effect if present
                    if not pd.isna(effect_desc) and effect_desc:
                        # Look for severity/consequence columns
                        severity = None
                        for col in df.columns:
                            if 'severity' in col.lower() or 'konsekvens' in col.lower():
                                severity = row.get(col)
                                break
                        
                        # Create impact fields based on available columns
                        safety_impact = None
                        environmental_impact = None
                        operational_impact = None
                        economic_impact = None
                        
                        # Look for impact columns in the spreadsheet
                        for col in df.columns:
                            if 'safety' in col.lower() or 'sikkerhet' in col.lower():
                                safety_impact = row.get(col)
                            elif 'environment' in col.lower() or 'miljø' in col.lower():
                                environmental_impact = row.get(col)
                            elif 'operation' in col.lower() or 'drift' in col.lower():
                                operational_impact = row.get(col)
                            elif 'economic' in col.lower() or 'økonomi' in col.lower():
                                economic_impact = row.get(col)
                        
                        effect = RCMFailureEffect(
                            description=effect_desc,
                            severity=severity,
                            failure_mode_id=current_mode.id,
                            safety_impact=safety_impact,
                            environmental_impact=environmental_impact,
                            operational_impact=operational_impact,
                            economic_impact=economic_impact
                        )
                        db.session.add(effect)
                        imported['effects'] += 1
                    
                    # Handle maintenance action if present
                    maintenance_title = None
                    for col in df.columns:
                        if 'tiltak' in col.lower() or 'action' in col.lower():
                            maintenance_title = row.get(col)
                            break
                    
                    if maintenance_title and not pd.isna(maintenance_title):
                        # Find interval columns
                        interval_days = None
                        interval_hours = None
                        maintenance_type = 'preventive'  # Default
                        
                        for col in df.columns:
                            if 'interval_dag' in col.lower() or 'interval_day' in col.lower():
                                interval_days = row.get(col)
                            elif 'interval_tim' in col.lower() or 'interval_hour' in col.lower():
                                interval_hours = row.get(col)
                            elif 'vedlikeholdstype' in col.lower() or 'maintenance_type' in col.lower():
                                maintenance_type = row.get(col)
                        
                        # Find strategy column
                        strategy = None
                        for col in df.columns:
                            if 'strategi' in col.lower() or 'strategy' in col.lower():
                                strategy = row.get(col)
                                break
                        
                        maintenance = RCMMaintenance(
                            title=maintenance_title,
                            description=row.get('Tiltaksbeskrivelse', ''),
                            maintenance_type=maintenance_type if not pd.isna(maintenance_type) else 'preventive',
                            interval_days=interval_days if not pd.isna(interval_days) else None,
                            interval_hours=interval_hours if not pd.isna(interval_hours) else None,
                            failure_mode_id=current_mode.id,
                            maintenance_strategy=strategy
                        )
                        db.session.add(maintenance)
                        imported['maintenance_actions'] += 1
            
            # Commit all changes
            db.session.commit()
            
            return imported
            
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