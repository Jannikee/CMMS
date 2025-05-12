// This script generates both Technical Structure and RCM Analysis Excel files
// Run this with Node.js

// First, install required package:
// npm install exceljs

const ExcelJS = require('exceljs');
const fs = require('fs');

// Create Technical Structure workbook
async function createTekniskPlasstruktur() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Teknisk Plasstruktur');
  
  // Define columns
  worksheet.columns = [
    { header: 'Arbeidsstasjonsnummer', key: 'id', width: 25 },
    { header: 'Benevnelse', key: 'name', width: 30 },
    { header: 'Teknisk navn', key: 'techName', width: 30 },
    { header: 'Beskrivelse', key: 'description', width: 50 }
  ];
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Light gray
  };
  
  // Add data
  const data = [
    // Machine level (Level 1)
    { id: "1000", name: "Produksjonslinje A", techName: "Packaging Line A", description: "Hovedproduksjonslinje for pakking av produkter" },
    
    // Subsystems (Level 2)
    { id: "1000.01", name: "Innmatingsenhet", techName: "Feed Unit", description: "Innmatingsenhet for råvarer" },
    { id: "1000.02", name: "Blandeenhet", techName: "Mixing Unit", description: "Blander ingredienser til produktet" },
    { id: "1000.03", name: "Pakkemaskin", techName: "Packaging Machine", description: "Hovedpakkemaskin for ferdigvarer" },
    { id: "1000.04", name: "Etiketteringsmaskin", techName: "Labeling Machine", description: "Påfører etiketter på produkter" },
    { id: "1000.05", name: "Transportbånd", techName: "Conveyor System", description: "Transportbånd mellom stasjoner" },
    
    // Components (Level 3)
    { id: "1000.01.001", name: "Innmatingspumpe", techName: "Feed Pump", description: "Pumpe for innføring av råvarer" },
    { id: "1000.01.002", name: "Innmatingssensor", techName: "Feed Sensor", description: "Sensor for deteksjon av råvarenivå" },
    { id: "1000.01.003", name: "Innmatingsventil", techName: "Feed Valve", description: "Kontrollventil for råvarestrøm" },
    
    { id: "1000.02.001", name: "Blandetank", techName: "Mixing Tank", description: "Hovedtank for blanding av produktet" },
    { id: "1000.02.002", name: "Blandevisp", techName: "Mixing Impeller", description: "Mekanisk blandevisp" },
    { id: "1000.02.003", name: "Blandemotorer", techName: "Mixing Motors", description: "Motorer for drift av blandesystemet" },
    { id: "1000.02.004", name: "Temperaturføler", techName: "Temperature Sensor", description: "Overvåker temperaturen i blandetank" },
    
    { id: "1000.03.001", name: "Pakkehode", techName: "Packaging Head", description: "Hovedenhet for pakkeprosessen" },
    { id: "1000.03.002", name: "Pakkesensor", techName: "Packaging Sensor", description: "Sensor for deteksjon av produkt" },
    { id: "1000.03.003", name: "Pakkeluftpumpe", techName: "Packaging Air Pump", description: "Luftpumpe for vakuumpakning" },
    { id: "1000.03.004", name: "Pakkefoliematere", techName: "Packaging Film Feeder", description: "Mater for pakkemateriale" },
    { id: "1000.03.005", name: "Pakkekontroller", techName: "Packaging Controller", description: "Hovedstyreenhet for pakkemaskinen" },
    
    { id: "1000.04.001", name: "Etiketthode", techName: "Labeling Head", description: "Hovedenhet for etikettapplisering" },
    { id: "1000.04.002", name: "Etikettrull", techName: "Label Roll Unit", description: "Holder for etikettrull" },
    { id: "1000.04.003", name: "Etikettskriver", techName: "Label Printer", description: "Skriver for etiketter" },
    { id: "1000.04.004", name: "Etikettscanner", techName: "Label Scanner", description: "Skanner for verifisering av etiketter" },
    
    { id: "1000.05.001", name: "Hovedmotor", techName: "Main Motor", description: "Hovedmotor for transportbånd" },
    { id: "1000.05.002", name: "Transportbelte", techName: "Conveyor Belt", description: "Selve transportbeltet" },
    { id: "1000.05.003", name: "Styreruller", techName: "Guide Rollers", description: "Styreruller for transportbåndet" },
    { id: "1000.05.004", name: "Hastighetssensor", techName: "Speed Sensor", description: "Sensor for måling av båndets hastighet" },
    
    // Second machine
    { id: "2000", name: "Produksjonslinje B", techName: "Packaging Line B", description: "Sekundær produksjonslinje for spesialprodukter" },
    
    // Subsystems for second machine
    { id: "2000.01", name: "Innmatingsenhet", techName: "Feed Unit", description: "Innmatingsenhet for råvarer" },
    { id: "2000.02", name: "Formingsmaskin", techName: "Forming Machine", description: "Former produktet til ønsket form" },
    { id: "2000.03", name: "Pakkemaskin", techName: "Packaging Machine", description: "Pakkemaskin for spesialprodukter" },
    
    // Components for second machine
    { id: "2000.01.001", name: "Innmatingsrør", techName: "Feed Pipe", description: "Hovedrør for innmating av råvarer" },
    { id: "2000.01.002", name: "Doseringsventil", techName: "Dosing Valve", description: "Kontrollerer mengden råvarer" },
    
    { id: "2000.02.001", name: "Formingsform", techName: "Forming Mold", description: "Form for produktutforming" },
    { id: "2000.02.002", name: "Hydraulikksystem", techName: "Hydraulic System", description: "Hydraulisk system for formpressing" },
    { id: "2000.02.003", name: "Formsensor", techName: "Mold Sensor", description: "Sensor for posisjonering av form" },
    
    { id: "2000.03.001", name: "Pakkemekanisme", techName: "Packaging Mechanism", description: "Mekanisme for pakking av spesialprodukter" },
    { id: "2000.03.002", name: "Pakkesensor", techName: "Packaging Sensor", description: "Sensor for deteksjon av produkt" }
  ];
  
  // Add rows
  data.forEach(item => {
    const row = worksheet.addRow(item);
    
    // Style rows based on level (indentation level indicated by number of dots in ID)
    const level = (item.id.match(/\./g) || []).length + 1;
    
    if (level === 1) { // Main machine
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCDCDC' } // Very light gray
      };
    } else if (level === 2) { // Subsystem
      row.font = { italic: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' } // Lighter gray
      };
    }
  });
  
  // Apply borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // Add filtering capability
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 4 }
  };
  
  // Freeze the top row and first column
  worksheet.views = [
    { state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2' }
  ];
  
  return workbook;
}

// Create RCM Analysis workbook
async function createRCMAnalysis() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('RCM Analysis');
  
  // Define columns
  worksheet.columns = [
    { header: 'Enhet', key: 'enhet', width: 15 },
    { header: 'Funksjon/Function', key: 'funksjon', width: 40 },
    { header: 'Functional Failure/Funksjonsfeil', key: 'failure', width: 35 },
    { header: 'Failure Mode/ Sviktmode', key: 'mode', width: 30 },
    { header: 'Failure Effect/ Effekt', key: 'effect', width: 40 },
    { header: 'Konsekvens', key: 'konsekvens', width: 15 },
    { header: 'Tiltak', key: 'tiltak', width: 40 },
    { header: 'Intervall_dager', key: 'dager', width: 15 },
    { header: 'Intervall_timer', key: 'timer', width: 15 },
    { header: 'Vedlikeholdstype', key: 'type', width: 20 }
  ];
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Light gray
  };
  
  // RCM Data
  const data = [
    // Data for Innmatingsenhet (Feed Unit) - 1000.01
    { enhet: "1000.01", funksjon: "Transportere råvarer fra lagertanker til blandeenhet", failure: "Klarer ikke å transportere råvarer", mode: "Pumpe svikter (P-001)", effect: "Produksjonslinje stopper, ingen råvarer til blandesystem", konsekvens: "Critical", tiltak: "Utfør tilstandsbasert vedlikehold på pumpe", dager: "90", timer: "", type: "preventive" },
    { enhet: "1000.01", funksjon: "Transportere råvarer fra lagertanker til blandeenhet", failure: "Klarer ikke å transportere råvarer", mode: "Innmatingsventil blokkert (V-001)", effect: "Redusert eller ingen flyt av råvarer", konsekvens: "High", tiltak: "Rengjør og inspiser ventil", dager: "45", timer: "", type: "preventive" },
    { enhet: "1000.01", funksjon: "Transportere råvarer fra lagertanker til blandeenhet", failure: "Transporterer feil mengde råvarer", mode: "Innmatingsventil kalibrert feil", effect: "Feil blandingsforhold, produktkvalitetsproblemer", konsekvens: "Medium", tiltak: "Kalibrer ventil og doseringssystem", dager: "180", timer: "", type: "predictive" },
    { enhet: "1000.01", funksjon: "Måle råvarenivå korrekt", failure: "Gir feilaktige nivåmålinger", mode: "Defekt nivåsensor (LS-001)", effect: "Ukorrekte nivåmålinger, mulig overfylling eller tomkjøring", konsekvens: "High", tiltak: "Test og kalibrer nivåsensorer", dager: "90", timer: "", type: "predictive" },
    
    // Data for Blandeenhet (Mixing Unit) - 1000.02
    { enhet: "1000.02", funksjon: "Blande råvarer til homogen blanding", failure: "Ufullstendig blanding", mode: "Blandevisp skadet eller slitt (M-001)", effect: "Ujevn produktkvalitet, ukorrekt blanding", konsekvens: "High", tiltak: "Inspiser og vedlikehold blandevisp", dager: "60", timer: "", type: "preventive" },
    { enhet: "1000.02", funksjon: "Blande råvarer til homogen blanding", failure: "Ufullstendig blanding", mode: "Blandemotorfeil (MM-001)", effect: "Ingen eller ineffektiv blanding", konsekvens: "Critical", tiltak: "Inspiser og test motor, smør lager", dager: "", timer: "2000", type: "predictive" },
    { enhet: "1000.02", funksjon: "Opprettholde korrekt blandetemperatur", failure: "Kan ikke oppnå eller vedlikeholde riktig temperatur", mode: "Temperatursensorfeil (TS-001)", effect: "Ukorrekt temperaturmåling, produktkvalitetsproblemer", konsekvens: "Medium", tiltak: "Kalibrer og test temperatursensorer", dager: "180", timer: "", type: "predictive" },
    { enhet: "1000.02", funksjon: "Opprettholde korrekt blandetemperatur", failure: "Kan ikke oppnå eller vedlikeholde riktig temperatur", mode: "Varmeelementfeil (HE-001)", effect: "Utilstrekkelig oppvarming, produktkvalitetsproblemer", konsekvens: "High", tiltak: "Inspiser og test varmeelementer", dager: "90", timer: "", type: "preventive" },
    
    // Data for Pakkemaskin (Packaging Machine) - 1000.03
    { enhet: "1000.03", funksjon: "Pakke produkt i egnet emballasje", failure: "Pakker ikke produkt", mode: "Pakkehode blokkert (PH-001)", effect: "Produktpakking stopper, nedetid", konsekvens: "Critical", tiltak: "Rengjør og inspiser pakkehode", dager: "30", timer: "", type: "preventive" },
    { enhet: "1000.03", funksjon: "Pakke produkt i egnet emballasje", failure: "Pakker ikke produkt", mode: "Luftpumpefeil (AP-001)", effect: "Vakuumpakning fungerer ikke, produktkvalitetsproblemer", konsekvens: "High", tiltak: "Test og vedlikehold luftpumpe", dager: "", timer: "1500", type: "preventive" },
    { enhet: "1000.03", funksjon: "Pakke produkt i egnet emballasje", failure: "Feil eller ukorrekt pakking", mode: "Feil i pakkekontroller (PC-001)", effect: "Ukorrekt pakking, emballasjefeil", konsekvens: "High", tiltak: "Test og kalibrer pakkekontrollere", dager: "90", timer: "", type: "predictive" },
    { enhet: "1000.03", funksjon: "Mate emballasjemateriale", failure: "Mater ikke emballasje", mode: "Feil i foliematemekanisme (FF-001)", effect: "Emballasjestopp, produktionsstopp", konsekvens: "High", tiltak: "Rengjør og smør matemekanisme", dager: "60", timer: "", type: "preventive" },
    
    // Data for Etiketteringsmaskin (Labeling Machine) - 1000.04
    { enhet: "1000.04", funksjon: "Påføre etiketter på produkter", failure: "Etiketterer ikke produkter", mode: "Etiketthode blokkert (LH-001)", effect: "Manglende etiketter, produkter må håndteres manuelt", konsekvens: "Medium", tiltak: "Rengjør og inspiser etiketthode", dager: "30", timer: "", type: "preventive" },
    { enhet: "1000.04", funksjon: "Påføre etiketter på produkter", failure: "Påfører feil eller uleselige etiketter", mode: "Feil i etikettskriver (LP-001)", effect: "Uleselige eller feil etiketter, produkter må ometiketteres", konsekvens: "Medium", tiltak: "Test og vedlikehold etikettskriver", dager: "60", timer: "", type: "preventive" },
    { enhet: "1000.04", funksjon: "Kontrollere etikettenes korrekthet", failure: "Detekterer ikke etikettkvalitet", mode: "Skannerfeil (LS-001)", effect: "Feiletiketterte produkter passerer uoppdaget", konsekvens: "High", tiltak: "Test og kalibrer etikettskannerens lesefunksjon", dager: "90", timer: "", type: "predictive" },
    
    // Data for Transportbånd (Conveyor System) - 1000.05
    { enhet: "1000.05", funksjon: "Transportere produkter mellom stasjoner", failure: "Transporterer ikke produkter", mode: "Hovedmotorfeil (CM-001)", effect: "Full produksjonsstopp, ingen produktbevegelse", konsekvens: "Critical", tiltak: "Inspiser og vedlikehold hovedmotor", dager: "", timer: "2500", type: "preventive" },
    { enhet: "1000.05", funksjon: "Transportere produkter mellom stasjoner", failure: "Transporterer ikke produkter", mode: "Slitt eller skadet transportbelte (CB-001)", effect: "Produkter faller av eller transporteres ikke korrekt", konsekvens: "High", tiltak: "Inspiser og bytt transportbelte ved behov", dager: "90", timer: "", type: "preventive" },
    { enhet: "1000.05", funksjon: "Transportere produkter ved riktig hastighet", failure: "Kjører med ukorrekt hastighet", mode: "Hastighetssensorfeil (SS-001)", effect: "Ukorrekt produktplassering, kollisjonsmulighet", konsekvens: "Medium", tiltak: "Test og kalibrer hastighetssensorer", dager: "180", timer: "", type: "predictive" },
    
    // Data for Produksjonslinje B components
    { enhet: "2000.01", funksjon: "Kontrollere råvaretilførsel", failure: "Kan ikke kontrollere råvaretilførsel", mode: "Doseringsventil svikter (DV-001)", effect: "Feil mengde råvarer, produktkvalitetsproblemer", konsekvens: "High", tiltak: "Inspiser og vedlikehold doseringsventil", dager: "45", timer: "", type: "preventive" },
    { enhet: "2000.02", funksjon: "Forme produkter til spesifikasjon", failure: "Former ikke produkter korrekt", mode: "Slitt formingsform (FM-001)", effect: "Produkter med feil dimensjoner", konsekvens: "Medium", tiltak: "Inspiser og bytt formingsformer ved behov", dager: "60", timer: "", type: "preventive" },
    { enhet: "2000.02", funksjon: "Forme produkter til spesifikasjon", failure: "Former ikke produkter korrekt", mode: "Hydraulikksystemlekkasje (HS-001)", effect: "Utilstrekkelig trykk for forming, feilformede produkter", konsekvens: "High", tiltak: "Inspiser og reparer hydraulikksystem", dager: "30", timer: "", type: "preventive" },
    { enhet: "2000.03", funksjon: "Pakke spesialprodukter", failure: "Pakker ikke produkter", mode: "Svikt i pakkemekanisme (PM-001)", effect: "Produksjonsstopp, manuelle inngrep nødvendig", konsekvens: "Critical", tiltak: "Inspiser og smør pakkemekanisme", dager: "30", timer: "", type: "preventive" }
  ];
  
  // Add rows
  data.forEach(item => {
    worksheet.addRow(item);
  });
  
  // Apply conditional formatting based on "Konsekvens" value
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header row
      const konsCell = row.getCell('konsekvens');
      if (konsCell.value === 'Critical') {
        konsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' } // Red
        };
        konsCell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White bold text
      } else if (konsCell.value === 'High') {
        konsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' } // Orange
        };
      } else if (konsCell.value === 'Medium') {
        konsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow
        };
      }
    }
  });
  
  // Apply borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // Add filtering capability
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 10 }
  };
  
  // Freeze the top row and first column
  worksheet.views = [
    { state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2' }
  ];
  
  return workbook;
}

// Main function to generate both Excel files
async function generateExcelFiles() {
  try {
    // Create workbooks
    const tekniskWB = await createTekniskPlasstruktur();
    const rcmWB = await createRCMAnalysis();
    
    // Save files
    await tekniskWB.xlsx.writeFile('Teknisk_Plassstruktur.xlsx');
    await rcmWB.xlsx.writeFile('RCM_Analysis.xlsx');
    
    console.log('Excel files have been created:');
    console.log('- Teknisk_Plassstruktur.xlsx');
    console.log('- RCM_Analysis.xlsx');
  } catch (error) {
    console.error('Error generating Excel files:', error);
  }
}

// Run the function
generateExcelFiles();