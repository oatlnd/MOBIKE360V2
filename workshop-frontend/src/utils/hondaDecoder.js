/**
 * Honda VIN & Engine Number Decoder Utility
 * Decodes 17-character Honda VINs (chassis numbers) and engine number codes.
 * Covers HMSI (Honda Motorcycle & Scooter India) vehicles.
 */

// ─── DATA TABLES ─────────────────────────────────────────────────────────────

const WMI_TABLE = {
    'ME4': { manufacturer: 'Honda Motorcycle & Scooter India (HMSI)', country: 'India',   plant_region: 'North/South India' },
    '1HF': { manufacturer: 'Honda Motor Co.',                          country: 'USA',     plant_region: 'North America' },
    'JH2': { manufacturer: 'Honda Motor Co.',                          country: 'Japan',   plant_region: 'Japan' },
    'JH4': { manufacturer: 'Honda Motor Co.',                          country: 'Japan',   plant_region: 'Japan' },
    'MLH': { manufacturer: 'Honda Vietnam Co.',                        country: 'Vietnam', plant_region: 'Vietnam' },
    '3H1': { manufacturer: 'Honda de México',                          country: 'Mexico',  plant_region: 'Mexico' },
    'MH1': { manufacturer: 'Honda Thailand',                           country: 'Thailand', plant_region: 'Thailand' },
};

const MODEL_FAMILY_TABLE = {
    // Activa family
    'JF3': { model: 'Honda Activa (1st Gen — 100cc)',    type: 'Scooter',      engine_cc: '100cc',  launch_year: 2001 },
    'JF4': { model: 'Honda Activa (2nd Gen)',             type: 'Scooter',      engine_cc: '102cc',  launch_year: 2005 },
    'JF5': { model: 'Honda Activa (3rd Gen)',             type: 'Scooter',      engine_cc: '109cc',  launch_year: 2009 },
    'JF6': { model: 'Honda Activa (4th Gen)',             type: 'Scooter',      engine_cc: '109cc',  launch_year: 2014 },
    'JF7': { model: 'Honda Activa 125 (1st Gen)',         type: 'Scooter',      engine_cc: '124cc',  launch_year: 2013 },
    'JF8': { model: 'Honda Activa 125 (FI)',              type: 'Scooter',      engine_cc: '124cc',  launch_year: 2018 },
    'JF9': { model: 'Honda Activa 5G / 6G (110cc)',       type: 'Scooter',      engine_cc: '109cc',  launch_year: 2017 },
    'JK1': { model: 'Honda Activa 6G (BS6)',              type: 'Scooter',      engine_cc: '109cc',  launch_year: 2020 },
    // Dio
    'JF2': { model: 'Honda Dio (1st Gen)',                type: 'Scooter',      engine_cc: '102cc',  launch_year: 2002 },
    'JF0': { model: 'Honda Dio (2nd Gen)',                type: 'Scooter',      engine_cc: '109cc',  launch_year: 2012 },
    'JK3': { model: 'Honda Dio (BS6)',                    type: 'Scooter',      engine_cc: '109cc',  launch_year: 2020 },
    // Grazia / Aviator
    'JK2': { model: 'Honda Grazia 125',                   type: 'Scooter',      engine_cc: '124cc',  launch_year: 2017 },
    'JF1': { model: 'Honda Aviator',                      type: 'Scooter',      engine_cc: '109cc',  launch_year: 2008 },
    // CB Shine / CB series
    'JC3': { model: 'Honda CB Shine / CB Shine SP',       type: 'Motorcycle',   engine_cc: '124cc',  launch_year: 2006 },
    'JC6': { model: 'Honda CB Shine (BS6)',               type: 'Motorcycle',   engine_cc: '124cc',  launch_year: 2020 },
    'JC4': { model: 'Honda CB Shine 100 / SP125',         type: 'Motorcycle',   engine_cc: '124cc',  launch_year: 2019 },
    // Unicorn
    'KC1': { model: 'Honda CB Unicorn (1st Gen)',         type: 'Motorcycle',   engine_cc: '149cc',  launch_year: 2004 },
    'KC4': { model: 'Honda CB Unicorn 150 (CBS)',         type: 'Motorcycle',   engine_cc: '149cc',  launch_year: 2012 },
    'KC9': { model: 'Honda CB Unicorn (BS6)',             type: 'Motorcycle',   engine_cc: '149cc',  launch_year: 2020 },
    // SP125 / Livo / Dream
    'JC1': { model: 'Honda Dream Neo',                    type: 'Motorcycle',   engine_cc: '109cc',  launch_year: 2012 },
    'JC2': { model: 'Honda Livo',                         type: 'Motorcycle',   engine_cc: '109cc',  launch_year: 2015 },
    // Hornet / CB160 / CB200
    'KC6': { model: 'Honda CB Hornet 160R',               type: 'Motorcycle',   engine_cc: '163cc',  launch_year: 2015 },
    'KC7': { model: 'Honda CB Hornet 2.0 (BS6)',          type: 'Motorcycle',   engine_cc: '184cc',  launch_year: 2020 },
    'KC8': { model: 'Honda CB200X',                       type: 'Motorcycle',   engine_cc: '184cc',  launch_year: 2021 },
    // CB350 / Highness
    'LD3': { model: "Honda CB350 (H'ness)",              type: 'Motorcycle',   engine_cc: '348cc',  launch_year: 2020 },
    'LD4': { model: 'Honda CB350RS',                      type: 'Motorcycle',   engine_cc: '348cc',  launch_year: 2021 },
    // XBlade / X-Blade
    'KC5': { model: 'Honda X-Blade 160',                  type: 'Motorcycle',   engine_cc: '162cc',  launch_year: 2018 },
    // NX / Crossover
    'LD1': { model: 'Honda NX200',                        type: 'Motorcycle',   engine_cc: '184cc',  launch_year: 2022 },
};

const PLANT_TABLE = {
    'M': { plant: 'Manesar Plant 1',           location: 'Manesar, Haryana',          established: 2000 },
    'N': { plant: 'Manesar Plant 2',           location: 'Manesar, Haryana',          established: 2000 },
    'H': { plant: 'Manesar Plant',             location: 'Manesar, Haryana',          established: 2000 },
    'W': { plant: 'Narsapura Plant',           location: 'Narsapura, Karnataka',      established: 2011 },
    'T': { plant: 'Tapukara Plant',            location: 'Tapukara, Rajasthan',       established: 2011 },
    'V': { plant: 'Vithalapur Plant',          location: 'Vithalapur, Gujarat',       established: 2016 },
    'A': { plant: 'Ahmedabad Plant',           location: 'Ahmedabad, Gujarat',        established: 2016 },
};

const YEAR_CODE_TABLE = {
    'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
    '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
};

const ENGINE_PREFIX_TABLE = {
    // Activa engines
    'JF3E': { model: 'Honda Activa (100cc)',         engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '100cc' },
    'JF5E': { model: 'Honda Activa (109cc)',         engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '109cc' },
    'JF9E': { model: 'Honda Activa 5G/6G',          engine_type: 'Air-cooled 4-stroke OBD2',    displacement: '109.51cc' },
    'JK1E': { model: 'Honda Activa 6G BS6',         engine_type: 'Air-cooled 4-stroke BS6 FI',  displacement: '109.51cc' },
    // Dio
    'JF0E': { model: 'Honda Dio',                   engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '109cc' },
    'JK3E': { model: 'Honda Dio BS6',               engine_type: 'Air-cooled 4-stroke BS6',     displacement: '109cc' },
    // CB Shine
    'JC36': { model: 'Honda CB Shine',              engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '124cc' },
    'JC6E': { model: 'Honda CB Shine BS6',          engine_type: 'Air-cooled 4-stroke BS6 FI',  displacement: '123.94cc' },
    // SP125
    'JC4E': { model: 'Honda SP125',                 engine_type: 'Air-cooled 4-stroke PGM-FI',  displacement: '123.94cc' },
    // Unicorn
    'KC13': { model: 'Honda CB Unicorn',            engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '149cc' },
    'KC4E': { model: 'Honda CB Unicorn 150',        engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '149cc' },
    // Hornet
    'KC6E': { model: 'Honda CB Hornet 160R',        engine_type: 'Air-cooled 4-stroke FI',      displacement: '163.7cc' },
    'KC7E': { model: 'Honda CB Hornet 2.0',         engine_type: 'Air-cooled 4-stroke BS6 FI',  displacement: '184.4cc' },
    // CB350
    'LD3E': { model: "Honda CB350 H'ness",         engine_type: 'Air-cooled 4-stroke OHC FI',  displacement: '348.36cc' },
    'LD4E': { model: 'Honda CB350RS',               engine_type: 'Air-cooled 4-stroke OHC FI',  displacement: '348.36cc' },
    // Livo / Dream
    'JC1E': { model: 'Honda Dream Neo',             engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '109cc' },
    'JC2E': { model: 'Honda Livo',                  engine_type: 'Air-cooled 4-stroke SOHC',    displacement: '109cc' },
    // Grazia
    'JK2E': { model: 'Honda Grazia 125',            engine_type: 'Air-cooled 4-stroke PGM-FI',  displacement: '124cc' },
};

// ─── DECODER FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Validate basic VIN structure
 */
export function validateVIN(vin) {
    const errors = [];
    const cleaned = vin.trim().toUpperCase();

    if (cleaned.length !== 17) {
        errors.push(`VIN must be exactly 17 characters (got ${cleaned.length})`);
    }
    if (/[IOQ]/.test(cleaned)) {
        errors.push('VIN cannot contain letters I, O, or Q (ambiguous characters)');
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
        errors.push('VIN contains invalid characters');
    }

    return errors;
}

/**
 * Decode HMSI VIN / Chassis Number
 */
export function decodeHondaChassis(vin) {
    if (!vin || typeof vin !== 'string') {
        return { valid: false, fields: [], error: 'No chassis number provided' };
    }
    const cleaned = vin.trim().toUpperCase();
    const errors = validateVIN(cleaned);

    if (errors.length > 0) {
        return { valid: false, fields: [], error: errors.join(', '), errors };
    }

    // Extract positions
    const wmi = cleaned.substring(0, 3);
    const modelCode = cleaned.substring(3, 6);
    const bodyCode = cleaned[6];
    const engineCode = cleaned[7];
    const checkDigit = cleaned[8];
    const yearCode = cleaned[9];
    const plantCode = cleaned[10];
    const serial = cleaned.substring(11, 17);

    // Resolve manufacturer
    const mfgInfo = WMI_TABLE[wmi] || {
        manufacturer: `Unknown manufacturer (WMI: ${wmi})`,
        country: 'Unknown',
        plant_region: 'Unknown',
    };

    // Resolve model
    const modelInfo = MODEL_FAMILY_TABLE[modelCode] || {
        model: `Unknown model (code: ${modelCode})`,
        type: 'Unknown',
        engine_cc: 'Unknown',
        launch_year: null,
    };

    // Resolve year
    const year = YEAR_CODE_TABLE[yearCode] || null;
    const yearNote = year === null ? `Year code "${yearCode}" not in standard HMSI table — verify against RC Book` : null;
    const yearDisplay = year || 'Unknown';

    // Resolve plant
    const plantInfo = PLANT_TABLE[plantCode] || {
        plant: `Unknown plant (code: ${plantCode})`,
        location: 'Unknown',
        established: null,
    };

    // Determine emission standard from year
    let emissionStandard = 'Unknown';
    if (typeof year === 'number') {
        if (year < 2010) emissionStandard = 'BS2 / Pre-BS3';
        else if (year < 2017) emissionStandard = 'BS3';
        else if (year < 2020) emissionStandard = 'BS4';
        else emissionStandard = 'BS6 / BS6 Phase 2';
    }

    // Determine warranty status (Honda standard warranty: 2 years from manufacture)
    let warrantyNote = 'Verify with Honda dealer portal';
    let vehicleAge = null;
    if (typeof year === 'number') {
        const currentYear = new Date().getFullYear();
        vehicleAge = currentYear - year;
        if (vehicleAge <= 2) {
            warrantyNote = 'Likely under standard 2-year warranty — verify with Honda dealer portal';
        } else if (vehicleAge <= 5) {
            warrantyNote = 'Standard warranty likely expired — check for extended warranty';
        } else {
            warrantyNote = 'Well outside standard warranty period';
        }
    }

    // Service interval recommendations
    const serviceNotes = generateServiceNotes(vehicleAge, emissionStandard, modelInfo.type);

    const fields = [
        { label: 'Full VIN', value: cleaned, description: 'Standardised 17-character VIN' },
        { label: 'WMI (Pos 1–3)', value: wmi, description: `${mfgInfo.manufacturer} (${mfgInfo.country})` },
        { label: 'Model Family Code (Pos 4–6)', value: modelCode, description: modelInfo.model },
        { label: 'Body Code (Pos 7)', value: bodyCode, description: 'Body / restraint code' },
        { label: 'Engine Variant Code (Pos 8)', value: engineCode, description: 'Engine variant' },
        { label: 'Check Digit (Pos 9)', value: checkDigit, description: 'Check digit' },
        { label: 'Model Year (Pos 10)', value: yearCode, description: `Model Year: ${yearDisplay}${yearNote ? ' *' : ''}` },
        { label: 'Plant Code (Pos 11)', value: plantCode, description: `${plantInfo.plant} (${plantInfo.location})` },
        { label: 'Production Serial (Pos 12–17)', value: serial, description: `Unit #${parseInt(serial, 10).toLocaleString()}` },
        { label: 'Emission Standard', value: emissionStandard, description: 'Derived from manufacture year' },
        { label: 'Warranty Status', value: warrantyNote, description: 'Warranty condition' },
    ];

    return {
        valid: true,
        vin: cleaned,
        decoded: {
            manufacturer: mfgInfo.manufacturer,
            country: mfgInfo.country,
            model: modelInfo.model,
            vehicle_type: modelInfo.type,
            engine_capacity: modelInfo.engine_cc,
            model_year: yearDisplay,
            year_note: yearNote,
            plant: plantInfo.plant,
            plant_location: plantInfo.location,
            serial_number: serial,
            serial_int: parseInt(serial, 10),
            emission_standard: emissionStandard,
            vehicle_age_years: vehicleAge,
            warranty_status: warrantyNote,
            model_launch_year: modelInfo.launch_year,
        },
        service_notes: serviceNotes,
        fields,
    };
}

/**
 * Decode HMSI Engine Number
 */
export function decodeHondaEngine(engineNo) {
    if (!engineNo || typeof engineNo !== 'string') {
        return { valid: false, fields: [], error: 'No engine number provided' };
    }
    const cleaned = engineNo.trim().toUpperCase();

    if (cleaned.length < 8) {
        return { valid: false, fields: [], error: 'Engine number too short — minimum 8 characters' };
    }

    const prefix4 = cleaned.substring(0, 4);
    let engineInfo = null;
    let sequence = '';
    let prefixUsed = '';

    if (ENGINE_PREFIX_TABLE[prefix4]) {
        engineInfo = ENGINE_PREFIX_TABLE[prefix4];
        sequence = cleaned.substring(4);
        prefixUsed = prefix4;
    } else {
        // Try 3-char prefix
        for (const [prefix, info] of Object.entries(ENGINE_PREFIX_TABLE)) {
            if (cleaned.startsWith(prefix.substring(0, 3))) {
                engineInfo = info;
                sequence = cleaned.substring(3);
                prefixUsed = prefix.substring(0, 3);
                break;
            }
        }
    }

    if (!engineInfo) {
        sequence = cleaned.substring(4);
        prefixUsed = prefix4;
        engineInfo = {
            model: `Unknown — prefix not in HMSI table (${prefix4})`,
            engine_type: 'Unknown',
            displacement: 'Unknown',
        };
    }

    let yearFromEngine = null;
    if (sequence.length > 0) {
        const possibleYearChar = sequence[0];
        if (YEAR_CODE_TABLE[possibleYearChar] && isNaN(parseInt(possibleYearChar, 10))) {
            yearFromEngine = YEAR_CODE_TABLE[possibleYearChar];
            sequence = sequence.substring(1);
        }
    }

    const fields = [
        { label: 'Engine Number', value: cleaned, description: 'Engine number' },
        { label: 'Prefix', value: prefixUsed, description: 'Engine model prefix' },
        { label: 'Model', value: engineInfo.model, description: 'Model match' },
        { label: 'Engine Type', value: engineInfo.engine_type, description: 'Technology details' },
        { label: 'Displacement', value: engineInfo.displacement, description: 'Engine displacement' },
        { label: 'Production Year', value: yearFromEngine || 'Not encoded in engine number — cross-check with chassis VIN', description: 'Year identifier' },
        { label: 'Sequence Number', value: sequence, description: 'Sequential serial' },
    ];

    return {
        valid: true,
        engine_no: cleaned,
        prefix: prefixUsed,
        sequence,
        decoded: {
            model: engineInfo.model,
            engine_type: engineInfo.engine_type,
            displacement: engineInfo.displacement,
            production_year: yearFromEngine || 'Not encoded in engine number — cross-check with chassis VIN',
            sequence_number: sequence,
        },
        fields,
    };
}

/**
 * Service Recommendation Engine
 */
export function generateServiceNotes(age, emission, vehicleType) {
    if (age === null) return ['Unable to generate service notes — year not determined'];
    const notes = [];

    if (age >= 1) notes.push('Engine oil and oil filter due every 3,000 km / 6 months');
    if (age >= 2) notes.push('Air filter inspection and cleaning recommended');
    if (age >= 3) {
        notes.push('Brake pads/shoes wear check — replace if below 2mm');
        notes.push('Spark plug replacement recommended (every 3 years)');
    }
    if (age >= 4) {
        notes.push('Tyre tread depth check — replace if wear bars visible');
        if (vehicleType === 'Motorcycle') {
            notes.push('Chain and sprocket inspection — replace set if hooked teeth visible');
        }
    }
    if (age >= 5) {
        notes.push('Battery capacity test recommended (5-year typical lifespan)');
        notes.push('Fork oil and rear shock absorber inspection');
    }
    if (age >= 6) notes.push('Coolant / brake fluid replacement (if disc brakes)');
    if (age >= 7) notes.push('Full electrical system check — wiring harness and connectors');
    if (age >= 8) notes.push('Throttle cable and brake cable replacement recommended');
    if (age >= 10) notes.push('Consider major overhaul — piston rings, valve clearance check');

    // Emission standard notes
    if (emission === 'BS6 / BS6 Phase 2') {
        notes.push('BS6 model — use only Honda-approved BS6 engine oil (5W-30 or 10W-30 PGM-FI grade)');
        notes.push('OBD port available for diagnostic scan — check for fault codes');
    } else if (emission === 'BS4') {
        notes.push('BS4 model — verify PUC certificate validity');
    } else if (['BS2 / Pre-BS3', 'BS3'].includes(emission)) {
        notes.push('Pre-BS4 model — PUC compliance may require attention in strict emission zones');
    }

    return notes;
}

/**
 * Cross-validate chassis VIN and engine number
 */
export function crossValidate(vinResult, engineResult) {
    if (!vinResult.valid || !engineResult.valid) {
        return { match: null, notes: ['Cannot cross-validate — one or both numbers are invalid'] };
    }

    const vinModel = vinResult.decoded.model || '';
    const engineModel = engineResult.decoded.model || '';
    const notes = [];

    const vinWords = vinModel.split(' ');
    const engineWords = engineModel.split(' ');

    const commonWords = vinWords.filter(w => engineWords.includes(w));
    const match = commonWords.length >= 2;

    if (match) {
        notes.push('Chassis and engine model families appear consistent');
    } else {
        notes.push('WARNING: Chassis and engine model families may not match — verify physically');
        notes.push(`Chassis points to: ${vinModel}`);
        notes.push(`Engine points to: ${engineModel}`);
    }

    const vinYear = vinResult.decoded.model_year;
    const engineYear = engineResult.decoded.production_year;

    if (typeof vinYear === 'number' && typeof engineYear === 'number') {
        const diff = Math.abs(vinYear - engineYear);
        if (diff === 0) {
            notes.push(`Chassis and engine year codes match: ${vinYear}`);
        } else if (diff <= 1) {
            notes.push(`Chassis year (${vinYear}) and engine year (${engineYear}) differ by 1 year — acceptable (end-of-year production)`);
        } else {
            notes.push(`WARNING: Year mismatch — chassis year ${vinYear} vs engine year ${engineYear} — may indicate engine replacement`);
        }
    }

    return { match, notes };
}
