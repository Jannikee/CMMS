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
    # In backend/services/import_service.py, update the import_from_excel method in RCMImportService:
    def import_from_excel(file_path, equipment_id):
        """Import RCM analysis from Excel file with headers on the second/third row"""
        try:
            # Read Excel file - first list all sheets
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            logger.info(f"Excel sheets found: {sheet_names}")
            
            # Try to find the RCM sheet
            target_sheet = None
            for sheet in sheet_names:
                sheet_lower = sheet.lower()
                if 'rcm' in sheet_lower or 'analyse' in sheet_lower:
                    target_sheet = sheet
                    break
            
            if not target_sheet and len(sheet_names) > 0:
                target_sheet = sheet_names[0]
                logger.info(f"No RCM sheet found, using first sheet: {target_sheet}")
            
            # Read the sheet without headers first to inspect structure
            df_raw = pd.read_excel(file_path, sheet_name=target_sheet, header=None)
            logger.info(f"Sheet has {len(df_raw)} rows and {len(df_raw.columns)} columns")
            
            # Log first few rows to see structure
            for i in range(min(5, len(df_raw))):
                logger.info(f"Row {i}: {df_raw.iloc[i].tolist()}")
            
            # Find the header row by looking for key words
            header_row = None
            for i in range(min(10, len(df_raw))):
                row_values = df_raw.iloc[i].astype(str).str.lower().tolist()
                # Check if this row contains header keywords
                if any('funksjon' in str(val) for val in row_values) or \
                any('function' in str(val) for val in row_values):
                    header_row = i
                    logger.info(f"Found header row at index {header_row}")
                    break
            
            if header_row is None:
                logger.warning("Could not find header row, defaulting to row 1")
                header_row = 1
            
            # Read the Excel file with the identified header row
            df = pd.read_excel(file_path, sheet_name=target_sheet, header=header_row)
            logger.info(f"Columns found: {df.columns.tolist()}")
            
            # Clean column names
            df.columns = [str(col).strip() for col in df.columns]
            
            # Map columns (be flexible with column names)
            column_map = {
                'unit': None,
                'function': None,
                'failure': None,
                'mode': None,
                'effect': None,
                'interval': None,
                'strategy': None
            }
            
            # Try to identify columns
            for col in df.columns:
                col_lower = col.lower()
                if 'enhet' in col_lower or 'unit' in col_lower:
                    column_map['unit'] = col
                elif 'funksjon' in col_lower and 'feil' not in col_lower:
                    column_map['function'] = col
                elif 'funksjonsfeil' in col_lower or 'functional' in col_lower:
                    column_map['failure'] = col
                elif 'svikt' in col_lower or 'mode' in col_lower:
                    column_map['mode'] = col
                elif 'effekt' in col_lower or 'effect' in col_lower or 'konsekvens' in col_lower:
                    column_map['effect'] = col
                elif 'mtf' in col_lower or 'intervall' in col_lower or 'timer' in col_lower:
                    column_map['interval'] = col
                elif 'strategi' in col_lower or 'strategy' in col_lower:
                    column_map['strategy'] = col
            
            logger.info(f"Column mapping: {column_map}")
            
            # Verify we have the essential columns
            if not column_map['function'] or not column_map['mode']:
                logger.error("Missing essential columns (function or mode)")
                return {
                    "success": False,
                    "message": "Could not identify required columns in Excel file"
                }
            
            # Initialize counters
            imported = {
                'units': 0,
                'functions': 0,
                'failures': 0,
                'modes': 0,
                'effects': 0,
                'maintenance_actions': 0
            }
            
            # Track created objects
            units_map = {}
            functions_map = {}
            failures_map = {}
            
            # Process each row
            current_unit = None
            default_unit = None
            
            # Create a default unit if none specified
            default_unit = RCMUnit(
                name="Equipment Unit",
                description=f"Main unit for equipment {equipment_id}",
                equipment_id=equipment_id,
                technical_id=""
            )
            db.session.add(default_unit)
            db.session.flush()
            units_map["default"] = default_unit
            imported['units'] += 1
            
            # Process data rows
            # Process data rows
            for idx, row in df.iterrows():
                try:
                    # Skip empty rows
                    if pd.isna(row.get(column_map['function'], '')):
                        continue
                    
                    # Get values from row
                    unit_val = row.get(column_map['unit']) if column_map['unit'] else None
                    function_val = row.get(column_map['function'])
                    failure_val = row.get(column_map['failure']) if column_map['failure'] else None
                    mode_val = row.get(column_map['mode']) if column_map['mode'] else None
                    effect_val = row.get(column_map['effect']) if column_map['effect'] else None
                    interval_val = row.get(column_map['interval']) if column_map['interval'] else None
                    strategy_val = row.get(column_map['strategy']) if column_map['strategy'] else None
                    
                    # Log what we're processing
                    logger.info(f"Row {idx}: function='{function_val}', unit='{unit_val}'")
                    
                    # Skip if no meaningful data
                    if pd.isna(function_val) or str(function_val).strip() == '':
                        continue
                    
                    # Handle unit
                    if unit_val and not pd.isna(unit_val) and str(unit_val).strip() != '':
                        unit_str = str(unit_val).strip()
                        if unit_str not in units_map:
                            unit = RCMUnit(
                                name=unit_str,
                                description=f"Unit: {unit_str}",
                                equipment_id=equipment_id,
                                technical_id=unit_str if '.' in unit_str else ""
                            )
                            db.session.add(unit)
                            db.session.flush()
                            units_map[unit_str] = unit
                            imported['units'] += 1
                            logger.info(f"Created unit: {unit_str} with ID {unit.id}")
                        current_unit = units_map[unit_str]
                    else:
                        current_unit = default_unit
                    
                    # Handle function - FIXED: ensure we actually create it
                    function_str = str(function_val).strip()
                    function_key = f"{current_unit.id}_{function_str}"
                    
                    if function_key not in functions_map:
                        # Create the function
                        function = RCMFunction(
                            name=function_str,
                            description="",
                            equipment_id=equipment_id,
                            unit_id=current_unit.id,
                            technical_id=current_unit.technical_id if hasattr(current_unit, 'technical_id') else ""
                        )
                        db.session.add(function)
                        db.session.flush()  # Important: flush to get the ID
                        
                        functions_map[function_key] = function
                        imported['functions'] += 1
                        logger.info(f"Created function: '{function_str}' with ID {function.id} for unit {current_unit.id}")
                    else:
                        logger.info(f"Function already exists: '{function_str}'")
                    
                    current_function = functions_map[function_key]
                    
                    # Handle functional failure
                    if failure_val and not pd.isna(failure_val):
                        failure_str = str(failure_val).strip()
                        failure_key = f"{current_function.id}_{failure_str}"
                        
                        if failure_key not in failures_map:
                            failure = RCMFunctionalFailure(
                                name=failure_str,
                                description="",
                                function_id=current_function.id
                            )
                            db.session.add(failure)
                            db.session.flush()
                            failures_map[failure_key] = failure
                            imported['failures'] += 1
                        
                        current_failure = failures_map[failure_key]
                        
                        # Handle failure mode
                        if mode_val and not pd.isna(mode_val):
                            mode_str = str(mode_val).strip()
                            
                            mode = RCMFailureMode(
                                name=mode_str,
                                description="",
                                failure_type="",
                                detection_method="",
                                functional_failure_id=current_failure.id
                            )
                            db.session.add(mode)
                            db.session.flush()
                            imported['modes'] += 1
                            
                            # Handle effect
                            if effect_val and not pd.isna(effect_val):
                                effect = RCMFailureEffect(
                                    description=str(effect_val).strip(),
                                    severity="Medium",
                                    failure_mode_id=mode.id,
                                    safety_impact="",
                                    environmental_impact="",
                                    operational_impact="",
                                    economic_impact=""
                                )
                                db.session.add(effect)
                                imported['effects'] += 1
                            # Handle maintenance action - FIXED SECTION
                            # Check both strategy and interval columns
                            has_maintenance = False
                            maintenance_title = ""
                            maintenance_desc = ""
                            interval_hours = None
                            interval_days = None
                            
                            # Get strategy/maintenance description
                            if strategy_val and not pd.isna(strategy_val) and str(strategy_val).strip():
                                has_maintenance = True
                                maintenance_desc = str(strategy_val).strip()
                                maintenance_title = f"{maintenance_desc} - {mode_str[:50]}"  # Limit title length
                                logger.info(f"Found strategy: {maintenance_desc}")
                            
                            # Get interval value
                            if interval_val and not pd.isna(interval_val):
                                try:
                                    # Handle different interval formats
                                    interval_str = str(interval_val).strip()
                                    
                                    # Remove any text, keep only numbers
                                    import re
                                    numbers = re.findall(r'\d+[\.,]?\d*', interval_str)
                                    if numbers:
                                        interval_value = float(numbers[0].replace(',', '.'))
                                        
                                        # Assume the interval is in hours if column mentions "timer" or "hours"
                                        # You can adjust this logic based on your Excel structure
                                        if column_map['interval'] and ('timer' in column_map['interval'].lower() or 
                                                                    'hour' in column_map['interval'].lower() or
                                                                    'mtf' in column_map['interval'].lower()):
                                            interval_hours = interval_value
                                            logger.info(f"Set interval_hours to {interval_hours}")
                                        else:
                                            # Otherwise assume days
                                            interval_days = int(interval_value)
                                            logger.info(f"Set interval_days to {interval_days}")
                                            
                                        has_maintenance = True
                                except Exception as e:
                                    logger.warning(f"Could not parse interval '{interval_val}': {e}")
                            
                            # Create maintenance action if we have any maintenance info
                            if has_maintenance:
                                # If we don't have a title from strategy, create one
                                if not maintenance_title:
                                    maintenance_title = f"Maintenance for {mode_str[:50]}"
                                
                                # Determine maintenance type based on strategy keywords
                                maintenance_type = 'preventive'  # default
                                if maintenance_desc:
                                    desc_lower = maintenance_desc.lower()
                                    if any(word in desc_lower for word in ['inspeksjon', 'inspection', 'visuell', 'visual']):
                                        maintenance_type = 'inspection'
                                    elif any(word in desc_lower for word in ['test', 'funksjonstest', 'testing']):
                                        maintenance_type = 'testing'
                                    elif any(word in desc_lower for word in ['smøring', 'lubrication', 'olje']):
                                        maintenance_type = 'lubrication'
                                    elif any(word in desc_lower for word in ['bytte', 'replace', 'skifte']):
                                        maintenance_type = 'replacement'
                                
                                maintenance = RCMMaintenance(
                                    title=maintenance_title[:255],  # Ensure title isn't too long
                                    description=maintenance_desc or "Maintenance action from RCM analysis",
                                    maintenance_type=maintenance_type,
                                    interval_hours=interval_hours,
                                    interval_days=interval_days,
                                    failure_mode_id=mode.id,
                                    maintenance_strategy=maintenance_desc or ""
                                )
                                db.session.add(maintenance)
                                db.session.flush()
                                imported['maintenance_actions'] += 1
                                logger.info(f"Created maintenance action: {maintenance_title} with interval_hours={interval_hours}, interval_days={interval_days}")
                            else:
                                logger.info(f"No maintenance action created for mode: {mode_str} (no strategy or interval found)")
                    
                except Exception as e:
                    logger.error(f"Error processing row {idx}: {str(e)}")
                    continue
            
            # Commit all changes
            db.session.commit()
            
            logger.info(f"Import completed: {imported}")
            
            return {
                "success": True,
                "message": f"Successfully imported RCM data",
                "imported": imported,
                "sheet_name": target_sheet
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error importing RCM data: {str(e)}", exc_info=True)
            return {
                "success": False,
                "message": f"Import failed: {str(e)}"
            }
        finally:
            if 'excel_file' in locals():
                excel_file.close()


    def extract_component_from_failure_mode(failure_mode_text):
        """Extract component name from failure mode text"""
        if not failure_mode_text:
            return None
        
        text = str(failure_mode_text).strip()
        
        # Pattern: "Problem - Component"
        if ' - ' in text:
            parts = text.split(' - ')
            if len(parts) >= 2:
                return parts[-1].strip()
        
        # Pattern: "Problem i/på/av Component"
        keywords = ['i ', 'på ', 'av ', 'hos ', 'ved ']
        for keyword in keywords:
            if keyword in text.lower():
                parts = text.split(keyword, 1)
                if len(parts) > 1:
                    return parts[1].strip().capitalize()
        
        return None

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