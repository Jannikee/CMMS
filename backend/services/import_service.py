# backend/services/import_service.py
# backend/services/import_service.py
import pandas as pd
import os
from datetime import datetime
from backend.models.rcm import RCMUnit, RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.models.machine import Machine, Subsystem, Component
from backend.database import db
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RCMImportService:
    """
RCM Import Service with enhanced sheet detection
"""
import pandas as pd
import os
from datetime import datetime
from backend.models.rcm import RCMUnit, RCMFunction, RCMFunctionalFailure, RCMFailureMode, RCMFailureEffect, RCMMaintenance
from backend.models.machine import Machine, Subsystem, Component
from backend.database import db
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RCMImportService:
    @staticmethod
    def import_from_excel(file_path, equipment_id):
        """Import RCM analysis from Excel file matching the layout in the images"""
        try:
            # Read Excel file - first list all sheets
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            logger.info(f"Excel sheets found: {sheet_names}")
            
            # Try to find the RCM sheet with flexible sheet name detection
            target_sheet = None
            
            # First look for exact matches
            for candidate in ["RCM", "RCM Analysis", "RCM Analyse"]:
                if candidate in sheet_names:
                    target_sheet = candidate
                    break
            
            # If no exact match, look for sheets containing "RCM" in their name
            if not target_sheet:
                for sheet in sheet_names:
                    if "rcm" in sheet.lower():
                        target_sheet = sheet
                        break
            
            # If still no match, check for other keywords
            if not target_sheet:
                for sheet in sheet_names:
                    if any(keyword in sheet.lower() for keyword in ["failure", "svikt", "fmea", "fmeca", "analyse"]):
                        target_sheet = sheet
                        break
            
            # If no matching sheet is found, use the first sheet but warn about it
            if not target_sheet:
                logger.warning(f"No RCM-related sheet found. Using first sheet: {sheet_names[0]}")
                target_sheet = sheet_names[0]
            else:
                logger.info(f"Found RCM sheet: {target_sheet}")
            
            # Read the selected sheet
            df = pd.read_excel(file_path, sheet_name=target_sheet)
            
            # Log columns for debugging
            logger.info(f"Excel columns found: {df.columns.tolist()}")
            
            # Map column names to handle slight variations
            column_mapping = {
                'Funksjon': 'Funksjon/Function',
                'Function': 'Funksjon/Function',
                'Funksjonsfeil': 'Functional Failure/Funksjonsfeil',
                'Functional Failure': 'Functional Failure/Funksjonsfeil',
                'Sviktmode': 'Failure Mode/ Sviktmode',
                'Failure Mode': 'Failure Mode/ Sviktmode',
                'Effekt': 'Failure Effect/ Effekt',
                'Failure Effect': 'Failure Effect/ Effekt',
                'Konsekvens': 'Konsekvens',
                'Consequence': 'Konsekvens',
                'Tiltak': 'Tiltak',
                'Maintenance Action': 'Tiltak',
                'Tittak og intervall': 'Tittak og intervall',
                'Intervall_dager': 'Intervall_dager',
                'Interval_days': 'Intervall_dager',
                'Intervall_timer': 'Intervall_timer',
                'Interval_hours': 'Intervall_timer',
                'Vedlikeholdstype': 'Vedlikeholdstype',
                'Maintenance Type': 'Vedlikeholdstype',
                'Enhet': 'Enhet',  
                'Unit': 'Enhet'     
            }
            
            # Rename columns to standardized names if needed
            for old_name, new_name in column_mapping.items():
                if old_name in df.columns and new_name not in df.columns:
                    df = df.rename(columns={old_name: new_name})
            
            # Log columns after mapping
            logger.info(f"Excel columns after mapping: {df.columns.tolist()}")
            
            # Check for required columns with flexible naming
            required_column_keywords = {
                'function': ['funksjon', 'function'],
                'failure': ['funksjonsfeil', 'functional failure', 'failure'],
                'mode': ['sviktmode', 'failure mode', 'mode'],
                'effect': ['effekt', 'failure effect', 'effect']
            }
            
            # Check if at least one column exists for each required type
            missing_required_types = []
            
            for required_type, keywords in required_column_keywords.items():
                if not any(any(keyword in col.lower() for keyword in keywords) for col in df.columns):
                    missing_required_types.append(required_type)
            
            if missing_required_types:
                return {
                    "success": False,
                    "message": f"Missing required column types: {', '.join(missing_required_types)}. Please check your Excel file."
                }
            
            # Continue with the existing import logic...
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
                'units': 0,
                'functions': 0,
                'failures': 0,
                'modes': 0,
                'effects': 0,
                'maintenance_actions': 0
            }
            
            # Find the column names that match our required types
            function_col = next((c for c in df.columns if any(keyword in c.lower() for keyword in required_column_keywords['function'])), None)
            failure_col = next((c for c in df.columns if any(keyword in c.lower() for keyword in required_column_keywords['failure'])), None)
            mode_col = next((c for c in df.columns if any(keyword in c.lower() for keyword in required_column_keywords['mode'])), None)
            effect_col = next((c for c in df.columns if any(keyword in c.lower() for keyword in required_column_keywords['effect'])), None)
            
            # Log the identified columns
            logger.info(f"Using columns: Function={function_col}, Failure={failure_col}, Mode={mode_col}, Effect={effect_col}")
            
            for _, row in df.iterrows():
                # Get unit name (if available)
                unit_col = next((c for c in df.columns if c == 'Enhet' or c == 'Unit'), None)
                unit_name = row.get(unit_col) if unit_col else None

                # Get function name
                function_name = row.get(function_col)
                
                # Get failure name
                failure_name = row.get(failure_col)
                
                # Get mode name
                mode_name = row.get(mode_col)
                
                # Get effect description
                effect_desc = row.get(effect_col)
                
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
                
                # If no unit is specified, use a default unit
                if not current_unit:
                    default_unit_name = "Default Unit"
                    if default_unit_name not in units_map:
                        unit = RCMUnit(
                            name=default_unit_name,
                            description="Default unit created during import",
                            equipment_id=equipment_id
                        )
                        db.session.add(unit)
                        db.session.flush()
                        units_map[default_unit_name] = unit
                        imported['units'] += 1
                    
                    current_unit = units_map[default_unit_name]
                        
                # Handle function - must have unit
                if not pd.isna(function_name) and function_name and current_unit:
                    if function_name not in functions_map:
                        function = RCMFunction(
                            name=function_name,
                            description=row.get('Funksjonsbeskrivelse', ''),
                            equipment_id=equipment_id,
                            technical_id=row.get('Technical ID', ''),
                            unit_id=current_unit.id
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
            
            return {
                "success": True,
                "imported": imported
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error importing RCM data: {str(e)}", exc_info=True)
            raise e
        finally:
            if 'excel_file' in locals():
                excel_file.close()

def import_hierarchy_from_excel(file_path):
    """Import machine hierarchy from Excel file"""
    import pandas as pd
    from backend.models.machine import Machine, Subsystem, Component
    from backend.database import db
    
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
            id_info = parse_technical_id(technical_id)
            
            if not id_info['level']:
                continue  # Invalid ID format
            
            if id_info['level'] != entity_type:
                continue  # ID format doesn't match declared type
            
            # Process based on entity type
            if entity_type == 'machine':
                # Create machine
                machines_created += 1
            elif entity_type == 'subsystem':
                # Create subsystem
                subsystems_created += 1
            elif entity_type == 'component':
                # Create component
                components_created += 1
        
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

# NEW CODE: Technical structure import functions

def import_technical_structure_park(file_path):
    """
    Import the entire machine park structure from Excel file.
    Creates all machines, subsystems, and components based on work station numbers.
    """
    excel_file = None
    try:
        # Read Excel file - first list all sheets
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        print("Excel sheets found:", sheet_names)
        
        # Try to find the "Teknisk plassstruktur" sheet
        target_sheet = "Teknisk plasstruktur"
        
        # Check if the target sheet exists
        if target_sheet in sheet_names:
            print(f"Found target sheet: {target_sheet}")
            df = pd.read_excel(file_path, sheet_name=target_sheet)
        else:
            # If the exact sheet name isn't found, look for something similar
            for sheet in sheet_names:
                if "teknisk" in sheet.lower() or "plassstruktur" in sheet.lower() or "struktur" in sheet.lower():
                    print(f"Found similar sheet: {sheet}")
                    df = pd.read_excel(file_path, sheet_name=sheet)
                    break
            else:
                # If no matching sheet is found, use the first sheet but warn about it
                print(f"Target sheet '{target_sheet}' not found. Using first sheet: {sheet_names[0]}")
                df = pd.read_excel(file_path, sheet_name=0)
        
        # Print columns for debugging
        print("Excel columns found:", df.columns.tolist())
        
        # Map possible column names
        column_mapping = {
            'Arbeidsstasjon': 'Arbeidsstasjonsnummer',
            'Benevnelse': 'Benevnelse',  # Already matches
            'Teknisk navn': 'Teknisk navn',  # Already matches
            'Beskrivelse': 'Beskrivelse'  # Already matches
        }
        
        # Rename columns to standardized names if needed
        for old_name, new_name in column_mapping.items():
            if old_name in df.columns and new_name not in df.columns:
                df = df.rename(columns={old_name: new_name})
        
        # Print columns after mapping for debugging
        print("Excel columns after mapping:", df.columns.tolist())
        
        # Verify required columns exist after mapping
        required_columns = ['Arbeidsstasjonsnummer', 'Benevnelse']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return {
                'success': False,
                'message': f"Missing required columns after mapping: {', '.join(missing_columns)}"
            }
        
        # Add a column to determine the level of each item based on work station number
        df['ItemLevel'] = df['Arbeidsstasjonsnummer'].apply(
            lambda x: len(str(x).split('.'))
        )
        
        # Sort dataframe by work station number to ensure parent items are created first
        df = df.sort_values(by=['ItemLevel', 'Arbeidsstasjonsnummer'])
        
        # Stats to track import progress
        stats = {
            'machines_added': 0,
            'subsystems_added': 0,
            'components_added': 0,
            'items_skipped': 0
        }
        
        # Dictionary to track created items by technical ID
        created_items = {}
        
        # Process each row in order
        for index, row in df.iterrows():
            station_number = str(row['Arbeidsstasjonsnummer']).strip()
            name = str(row['Benevnelse']).strip()
            description = str(row.get('Beskrivelse', ''))
            technical_name = str(row.get('Teknisk navn ', ''))  # Note the space after 'navn'
            location = ''  # Default empty location since it's not in your Excel
            
            # Skip empty rows
            if not station_number or station_number == 'nan':
                continue
                
            # Determine item level
            parts = station_number.split('.')
            level = len(parts)
            
            # Process based on level (machine, subsystem, component)
            if level == 1:
                # This is a machine
                existing = Machine.query.filter_by(technical_id=station_number).first()
                if existing:
                    # Machine already exists, skip
                    created_items[station_number] = {'id': existing.id, 'type': 'machine'}
                    stats['items_skipped'] += 1
                    continue
                
                # Create new machine
                machine = Machine(
                    name=name,
                    technical_id=station_number,
                    description=description,
                    location=location,
                    qr_code=str(uuid.uuid4())  # Generate unique QR code
                )
                db.session.add(machine)
                db.session.flush()  # Get ID without committing yet
                
                created_items[station_number] = {'id': machine.id, 'type': 'machine'}
                stats['machines_added'] += 1
                
            elif level == 2:
                # This is a subsystem
                # Find parent machine
                parent_id = parts[0]
                
                if parent_id not in created_items or created_items[parent_id]['type'] != 'machine':
                    # Parent machine not found, skip
                    stats['items_skipped'] += 1
                    continue
                
                machine_id = created_items[parent_id]['id']
                
                # Check if subsystem already exists
                existing = Subsystem.query.filter_by(technical_id=station_number).first()
                if existing:
                    # Subsystem already exists, skip
                    created_items[station_number] = {'id': existing.id, 'type': 'subsystem'}
                    stats['items_skipped'] += 1
                    continue
                
                # Create new subsystem
                subsystem = Subsystem(
                    name=name,
                    technical_id=station_number,
                    description=description,
                    machine_id=machine_id
                )
                db.session.add(subsystem)
                db.session.flush()  # Get ID without committing yet
                
                created_items[station_number] = {'id': subsystem.id, 'type': 'subsystem'}
                stats['subsystems_added'] += 1
                
            elif level == 3:
                # This is a component
                # Find parent subsystem and machine
                parent_machine_id = parts[0]
                parent_subsystem_id = f"{parts[0]}.{parts[1]}"
                
                if (parent_subsystem_id not in created_items or 
                    created_items[parent_subsystem_id]['type'] != 'subsystem'):
                    # Parent subsystem not found, skip
                    stats['items_skipped'] += 1
                    continue
                
                subsystem_id = created_items[parent_subsystem_id]['id']
                machine_id = created_items[parent_machine_id]['id']
                
                # Check if component already exists
                existing = Component.query.filter_by(technical_id=station_number).first()
                if existing:
                    # Component already exists, skip
                    stats['items_skipped'] += 1
                    continue
                
                # Create new component - REMOVE description parameter
                component = Component(
                    name=name,
                    technical_id=station_number,
                    location=location,
                    function=technical_name,  # Use technical name as function
                    subsystem_id=subsystem_id,
                    machine_id=machine_id
                )
                db.session.add(component)
                stats['components_added'] += 1
            
            else:
                # Deeper levels are not supported in this version
                stats['items_skipped'] += 1
        
        # Commit all changes
        db.session.commit()
        
        return {
            'success': True,
            'message': "Technical structure imported successfully",
            'stats': stats
        }
        
    except Exception as e:
        # Rollback in case of error
        db.session.rollback()
        logger.error(f"Error importing technical structure: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise e
        
    finally:
        # Explicitly close the Excel file to release the lock
        if excel_file is not None:
            excel_file.close()
            
def import_technical_structure_equipment(file_path, equipment_id):
    """
    Import components for a specific equipment.
    This is the original functionality that expects an equipment_id.
    """
    try:
        # Read Excel file - first list all sheets
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        print("Excel sheets found:", sheet_names)
        
        # Try to find the "Teknisk plassstruktur" sheet
        target_sheet = "Teknisk plassstruktur"
        
        # Check if the target sheet exists
        if target_sheet in sheet_names:
            print(f"Found target sheet: {target_sheet}")
            df = pd.read_excel(file_path, sheet_name=target_sheet)
        else:
            # If the exact sheet name isn't found, look for something similar
            for sheet in sheet_names:
                if "teknisk" in sheet.lower() or "plassstruktur" in sheet.lower() or "struktur" in sheet.lower():
                    print(f"Found similar sheet: {sheet}")
                    df = pd.read_excel(file_path, sheet_name=sheet)
                    break
            else:
                # If no matching sheet is found, use the first sheet but warn about it
                print(f"Target sheet '{target_sheet}' not found. Using first sheet: {sheet_names[0]}")
                df = pd.read_excel(file_path, sheet_name=0)
        
        # Print columns for debugging
        print("Excel columns found:", df.columns.tolist())
        
        # Map possible column names
        column_mapping = {
            'Arbeidsstasjon': 'Arbeidsstasjonsnummer',
            'Benevnelse': 'Benevnelse',  # Already matches
            'Teknisk navn': 'Teknisk navn',  # Already matches
            'Beskrivelse': 'Beskrivelse'  # Already matches
        }
        
        # Rename columns to standardized names if needed
        for old_name, new_name in column_mapping.items():
            if old_name in df.columns and new_name not in df.columns:
                df = df.rename(columns={old_name: new_name})
        
        # Print columns after mapping for debugging
        print("Excel columns after mapping:", df.columns.tolist())
        
        # Verify required columns exist after mapping
        required_columns = ['Arbeidsstasjonsnummer', 'Benevnelse']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return {
                'success': False,
                'message': f"Missing required columns after mapping: {', '.join(missing_columns)}"
            }
        
        # Get the equipment
        equipment = Machine.query.get(equipment_id)
        equipment_technical_id = equipment.technical_id
        
        # Filter rows relevant to this equipment
        df = df[df['Arbeidsstasjonsnummer'].astype(str).str.startswith(equipment_technical_id)]
        
        # Add a column to determine the level of each item
        df['ItemLevel'] = df['Arbeidsstasjonsnummer'].apply(
            lambda x: len(str(x).split('.'))
        )
        
        # Sort by level and work station number
        df = df.sort_values(by=['ItemLevel', 'Arbeidsstasjonsnummer'])
        
        # Stats to track import progress
        stats = {
            'subsystems_added': 0,
            'components_added': 0,
            'items_skipped': 0
        }
        
        # Dictionary to track created subsystems by technical ID
        created_subsystems = {}
        
        # Process each row in order
        for index, row in df.iterrows():
            station_number = str(row['Arbeidsstasjonsnummer']).strip()
            name = str(row['Benevnelse']).strip()
            description = str(row.get('Beskrivelse', ''))
            technical_name = str(row.get('Teknisk navn', ''))
            location = ''  # Default empty location since it's not in your Excel
            
            # Skip empty rows
            if not station_number or station_number == 'nan':
                continue
                
            # Skip the equipment itself
            if station_number == equipment_technical_id:
                continue
            
            # Determine item level
            parts = station_number.split('.')
            level = len(parts)
            
            # Process based on level (subsystem or component)
            if level == 2:
                # This is a subsystem
                # Check if subsystem already exists
                existing = Subsystem.query.filter_by(technical_id=station_number).first()
                if existing:
                    # Subsystem already exists, skip
                    created_subsystems[station_number] = existing.id
                    stats['items_skipped'] += 1
                    continue
                
                # Create new subsystem
                subsystem = Subsystem(
                    name=name,
                    technical_id=station_number,
                    description=description,
                    machine_id=equipment.id
                )
                db.session.add(subsystem)
                db.session.flush()  # Get ID without committing yet
                
                created_subsystems[station_number] = subsystem.id
                stats['subsystems_added'] += 1
                
            elif level == 3:
                # This is a component
                # Find parent subsystem
                parent_subsystem_id = f"{parts[0]}.{parts[1]}"
                
                if parent_subsystem_id not in created_subsystems:
                    # Parent subsystem not found, skip
                    stats['items_skipped'] += 1
                    continue
                
                subsystem_id = created_subsystems[parent_subsystem_id]
                
                # Check if component already exists
                existing = Component.query.filter_by(technical_id=station_number).first()
                if existing:
                    # Component already exists, skip
                    stats['items_skipped'] += 1
                    continue
                
                # Create new component
                component = Component(
                    name=name,
                    technical_id=station_number,
                    description=description,
                    location=location,
                    function=technical_name,  # Use technical name as function
                    subsystem_id=subsystem_id,
                    machine_id=equipment.id
                )
                db.session.add(component)
                stats['components_added'] += 1
        
        # Commit all changes
        db.session.commit()
        
        return {
            'success': True,
            'message': "Equipment components imported successfully",
            'stats': stats
        }
        
    except Exception as e:
        # Rollback in case of error
        db.session.rollback()
        logger.error(f"Error importing equipment components: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise e