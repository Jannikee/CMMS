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
        """Import RCM analysis from Excel file with headers on the second/third row"""
        try:
            # Read Excel file - first list all sheets
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            logger.info(f"Excel sheets found: {sheet_names}")
            
            # Try to find the RCM sheet with flexible sheet name detection
            target_sheet = None
            
            # First look for exact matches
            for candidate in ["RCM", "RCM Analysis", "RCM Analyse", "Analyseobejkt"]:
                if candidate in sheet_names:
                    target_sheet = candidate
                    break
            
            # If no exact match, look for sheets containing "RCM" in their name
            if not target_sheet:
                for sheet in sheet_names:
                    if "rcm" in sheet.lower() or "analyse" in sheet.lower():
                        target_sheet = sheet
                        break
            
            # If still no match, use the first sheet but warn about it
            if not target_sheet:
                logger.warning(f"No RCM-related sheet found. Using first sheet: {sheet_names[0]}")
                target_sheet = sheet_names[0]
            else:
                logger.info(f"Found RCM sheet: {target_sheet}")
            
            # First, try to identify the header row by reading the first few rows
            potential_headers = []
            for i in range(5):  # Check first 5 rows for headers
                # Read just this row
                try:
                    header_row = pd.read_excel(file_path, sheet_name=target_sheet, header=None, nrows=1, skiprows=i)
                    potential_headers.append((i, header_row.iloc[0].tolist()))
                    logger.info(f"Row {i+1} content: {header_row.iloc[0].tolist()}")
                except Exception as e:
                    logger.error(f"Error reading row {i}: {e}")
                    continue
            
            # Identify which row looks like a header row by checking for key column names
            header_row_index = 0  # Default to first row
            header_keywords = ['funksjon', 'function', 'sviktmode', 'failure', 'effekt', 'effect', 'konsekvens']
            
            for idx, row_content in potential_headers:
                # Convert to string and lowercase for comparison
                row_content_str = [str(cell).lower() if cell is not None else '' for cell in row_content]
                # Count how many header keywords appear in this row
                keyword_matches = sum(1 for keyword in header_keywords if any(keyword in cell for cell in row_content_str))
                logger.info(f"Row {idx+1} has {keyword_matches} header keyword matches")
                
                if keyword_matches >= 2:  # If at least 2 header keywords found
                    header_row_index = idx
                    logger.info(f"Selected row {idx+1} as the header row")
                    break
            
            # Now read the Excel with the appropriate header row
            df = pd.read_excel(file_path, sheet_name=target_sheet, header=header_row_index)
            
            # Log columns found
            logger.info(f"Excel columns found after header detection: {df.columns.tolist()}")
            
            # Handle the case where headers might contain NaN or None
            df.columns = [str(col) if col is not None else f"Unnamed_{i}" for i, col in enumerate(df.columns)]
            logger.info(f"Cleaned column names: {df.columns.tolist()}")
            
            # Find the key columns by inspecting all column names
            function_col = None
            failure_col = None
            mode_col = None
            effect_col = None
            strategy_col = None
            interval_col = None
            unit_col = None
            
            # Check each column for potential matches
            for col in df.columns:
                col_lower = str(col).lower()
                
                # Function column
                if any(keyword in col_lower for keyword in ['funksjon', 'function', 'virkemåte']):
                    function_col = col
                    logger.info(f"Found function column: {col}")
                
                # Functional Failure column
                elif any(keyword in col_lower for keyword in ['funksjonsfeil', 'functional failure']):
                    failure_col = col
                    logger.info(f"Found failure column: {col}")
                
                # Failure Mode column
                elif any(keyword in col_lower for keyword in ['sviktmode', 'failure mode', 'feilmåte']):
                    mode_col = col
                    logger.info(f"Found mode column: {col}")
                
                # Effect column
                elif any(keyword in col_lower for keyword in ['effekt', 'effect', 'konsekvens']):
                    effect_col = col
                    logger.info(f"Found effect column: {col}")
                
                # Strategy column
                elif any(keyword in col_lower for keyword in ['strategi', 'strategy', 'håndtering']):
                    strategy_col = col
                    logger.info(f"Found strategy column: {col}")
                
                # Interval column
                elif any(keyword in col_lower for keyword in ['mtf', 'intervall', 'interval', 'timer']):
                    interval_col = col
                    logger.info(f"Found interval column: {col}")
                
                # Unit column
                elif any(keyword in col_lower for keyword in ['enhet', 'unit']):
                    unit_col = col
                    logger.info(f"Found unit column: {col}")
            
            # Check if we identified the critical columns
            missing_cols = []
            if not function_col:
                missing_cols.append("function")
            if not failure_col:
                missing_cols.append("failure")
            if not mode_col:
                missing_cols.append("mode")
            if not effect_col:
                missing_cols.append("effect")
                
            if missing_cols:
                # Try an alternative approach - check each row for column indexes
                logger.info("Trying alternative approach to find columns...")
                
                # Read first few rows again without header
                alt_df = pd.read_excel(file_path, sheet_name=target_sheet, header=None, nrows=10)
                
                # Look for column indexes based on header names in first few rows
                for i in range(min(10, len(alt_df))):
                    row = alt_df.iloc[i]
                    for j, cell in enumerate(row):
                        if not pd.isna(cell):
                            cell_str = str(cell).lower()
                            # Check for function column
                            if "funksjon" in cell_str and not function_col:
                                function_col = j
                                logger.info(f"Alt method: Found function column at index {j}")
                            # Check for failure column
                            elif "funksjonsfeil" in cell_str and not failure_col:
                                failure_col = j
                                logger.info(f"Alt method: Found failure column at index {j}")
                            # Check for mode column
                            elif "sviktmode" in cell_str and not mode_col:
                                mode_col = j
                                logger.info(f"Alt method: Found mode column at index {j}")
                            # Check for effect column
                            elif ("effekt" in cell_str or "konsekvens" in cell_str) and not effect_col:
                                effect_col = j
                                logger.info(f"Alt method: Found effect column at index {j}")
                
                # If we still haven't found all required columns, use column index based on screenshot
                if not function_col:
                    function_col = 1  # Column B (0-indexed)
                    logger.info("Using default index 1 for function column (B)")
                if not failure_col:
                    failure_col = 2  # Column C
                    logger.info("Using default index 2 for failure column (C)")
                if not mode_col:
                    mode_col = 3  # Column D
                    logger.info("Using default index 3 for mode column (D)")
                if not effect_col:
                    effect_col = 5  # Column F
                    logger.info("Using default index 5 for effect column (F)")
                if not interval_col:
                    interval_col = 7  # Column H
                    logger.info("Using default index 7 for interval column (H)")
                if not strategy_col:
                    strategy_col = 23  # Column X
                    logger.info("Using default index 23 for strategy column (X)")
                
                # Re-read with numeric indexes for columns
                df = pd.read_excel(file_path, sheet_name=target_sheet, header=None, skiprows=header_row_index+1)
                
                """# Check if we have enough columns
                if len(df.columns) < max(int(function_col), int(failure_col), int(mode_col), int(effect_col)):
                    return {
                        "success": False,
                        "message": f"Excel file doesn't have enough columns. Expected at least {max(function_col, failure_col, mode_col, effect_col)+1} columns."
                    }"""
            
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
            
            # Skip headers when processing data
            for _, row in df.iterrows():
                # Skip rows that seem like headers
                if any(keyword in str(row.get(function_col, "")).lower() 
                      for keyword in ["funksjon", "function", "virkemåte"]):
                    logger.info(f"Skipping header row: {row.get(function_col)}")
                    continue
                
                # Get unit name (if available)
                unit_name = row.get(unit_col) if unit_col else None
                
                # Get function name - handle index or column name access
                function_name = None
                try:
                    if isinstance(function_col, int):
                        function_name = row.iloc[function_col] if function_col < len(row) else None
                    else:
                        function_name = row.get(function_col)
                except Exception as e:
                    logger.error(f"Error accessing function column: {e}")
                
                # Get failure name
                failure_name = None
                try:
                    if isinstance(failure_col, int):
                        failure_name = row.iloc[failure_col] if failure_col < len(row) else None
                    else:
                        failure_name = row.get(failure_col)
                except Exception as e:
                    logger.error(f"Error accessing failure column: {e}")
                
                # Get mode name
                mode_name = None
                try:
                    if isinstance(mode_col, int):
                        mode_name = row.iloc[mode_col] if mode_col < len(row) else None
                    else:
                        mode_name = row.get(mode_col)
                except Exception as e:
                    logger.error(f"Error accessing mode column: {e}")
                
                # Get effect description
                effect_desc = None
                try:
                    if isinstance(effect_col, int):
                        effect_desc = row.iloc[effect_col] if effect_col < len(row) else None
                    else:
                        effect_desc = row.get(effect_col)
                except Exception as e:
                    logger.error(f"Error accessing effect column: {e}")
                
                # Get strategy
                strategy = None
                if strategy_col:
                    try:
                        if isinstance(strategy_col, int):
                            strategy = row.iloc[strategy_col] if strategy_col < len(row) else None
                        else:
                            strategy = row.get(strategy_col)
                    except Exception as e:
                        logger.error(f"Error accessing strategy column: {e}")
                
                # Get interval
                interval_hours = None
                if interval_col:
                    try:
                        interval_value = None
                        if isinstance(interval_col, int):
                            interval_value = row.iloc[interval_col] if interval_col < len(row) else None
                        else:
                            interval_value = row.get(interval_col)
                            
                        if pd.notna(interval_value) and interval_value != "" and interval_value is not None:
                            try:
                                interval_hours = float(interval_value)
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert interval value '{interval_value}' to float")
                    except Exception as e:
                        logger.error(f"Error accessing interval column: {e}")
                
                # Skip rows with missing essential data
                if (pd.isna(function_name) or function_name is None or function_name == "") and \
                   (pd.isna(failure_name) or failure_name is None or failure_name == "") and \
                   (pd.isna(mode_name) or mode_name is None or mode_name == "") and \
                   (pd.isna(effect_desc) or effect_desc is None or effect_desc == ""):
                    continue
                
                # Handle Unit
                if unit_name and not pd.isna(unit_name) and str(unit_name).strip() != "":
                    unit_name = str(unit_name).strip()
                    if unit_name not in units_map:
                        unit = RCMUnit(
                            name=unit_name,
                            description=f"Unit imported from Excel: {unit_name}",
                            equipment_id=equipment_id,
                            technical_id=''
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
                if function_name and not pd.isna(function_name) and str(function_name).strip() != "":
                    function_name = str(function_name).strip()
                    if function_name not in functions_map:
                        function = RCMFunction(
                            name=function_name,
                            description='',  # No description in the example
                            equipment_id=equipment_id,
                            technical_id='',
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
                if failure_name and not pd.isna(failure_name) and str(failure_name).strip() != "":
                    failure_name = str(failure_name).strip()
                    failure_key = (current_function.id, failure_name)
                    if failure_key not in failures_map:
                        failure = RCMFunctionalFailure(
                            name=failure_name,
                            description='',  # No description in the example
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
                if mode_name and not pd.isna(mode_name) and str(mode_name).strip() != "":
                    mode_name = str(mode_name).strip()
                    mode_key = (current_failure.id, mode_name)
                    
                    if mode_key not in modes_map:
                        mode = RCMFailureMode(
                            name=mode_name,
                            description='',  # No description in the example
                            failure_type='',
                            detection_method='',
                            functional_failure_id=current_failure.id
                        )
                        db.session.add(mode)
                        db.session.flush()
                        modes_map[mode_key] = mode
                        imported['modes'] += 1
                    
                    current_mode = modes_map[mode_key]
                    
                    # Handle failure effect if present
                    if effect_desc and not pd.isna(effect_desc) and str(effect_desc).strip() != "":
                        effect_desc = str(effect_desc).strip()
                        effect = RCMFailureEffect(
                            description=effect_desc,
                            severity='',  # No severity in the example
                            failure_mode_id=current_mode.id,
                            safety_impact='',
                            environmental_impact='',
                            operational_impact='',
                            economic_impact=''
                        )
                        db.session.add(effect)
                        imported['effects'] += 1
                    
                    # Handle maintenance action if present (using strategy)
                    if strategy and not pd.isna(strategy) and str(strategy).strip() != "":
                        strategy = str(strategy).strip()
                        maintenance = RCMMaintenance(
                            title=f"Maintenance for {mode_name}",
                            description=strategy,
                            maintenance_type='preventive',  # Default
                            interval_hours=interval_hours,
                            interval_days=None,  # No days interval in the example
                            failure_mode_id=current_mode.id,
                            maintenance_strategy=strategy
                        )
                        db.session.add(maintenance)
                        imported['maintenance_actions'] += 1
            
            # Commit all changes
            db.session.commit()
            
            return {
                "success": True,
                "imported": imported,
                "sheet_name": target_sheet
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