/**
 * Vehicle Decoder Utility
 * Decodes engine numbers and chassis/VIN numbers to reveal manufacturer,
 * model, year and other meaningful vehicle information.
 */

// ─────────────────────────────────────────────────────────────────────────────
// WMI (World Manufacturer Identifier) — first 3 chars of VIN/Chassis
// ─────────────────────────────────────────────────────────────────────────────
const WMI_TABLE = {
    // Honda
    ME4: { manufacturer: 'Honda Motorcycle India', country: 'India' },
    MH1: { manufacturer: 'Honda Motorcycle Thailand', country: 'Thailand' },
    JH2: { manufacturer: 'Honda Motor Co. Ltd.', country: 'Japan' },
    JH4: { manufacturer: 'Honda Motor Co. Ltd.', country: 'Japan' },
    JHM: { manufacturer: 'Honda Motor Co. Ltd.', country: 'Japan' },
    MH2: { manufacturer: 'Honda Thailand', country: 'Thailand' },
    // Yamaha
    VG5: { manufacturer: 'Yamaha Motor India', country: 'India' },
    MH8: { manufacturer: 'Yamaha Thailand', country: 'Thailand' },
    JYA: { manufacturer: 'Yamaha Motor Co. Ltd.', country: 'Japan' },
    JY4: { manufacturer: 'Yamaha Motor Co. Ltd.', country: 'Japan' },
    // Suzuki
    JS1: { manufacturer: 'Suzuki Motor Corp.', country: 'Japan' },
    MH6: { manufacturer: 'Suzuki India', country: 'India' },
    // TVS
    MD6: { manufacturer: 'TVS Motor Company', country: 'India' },
    MDT: { manufacturer: 'TVS Motor Company', country: 'India' },
    // Bajaj
    MD2: { manufacturer: 'Bajaj Auto Ltd.', country: 'India' },
    MD3: { manufacturer: 'Bajaj Auto Ltd.', country: 'India' },
    // KTM
    VBK: { manufacturer: 'KTM Sportmotorcycle AG', country: 'Austria' },
    // Royal Enfield
    ME3: { manufacturer: 'Royal Enfield Motors', country: 'India' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Model Code Table — Honda 4-char codes (appear in VIN pos 4-7 & engine prefix)
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_CODE_TABLE = {
    // Honda
    JF98: { model: 'PCX 125', type: 'Scooter', displacement: '125cc' },
    JF56: { model: 'PCX 150', type: 'Scooter', displacement: '150cc' },
    JF28: { model: 'Dio / Lead', type: 'Scooter', displacement: '110cc' },
    JF31: { model: 'Activa 110', type: 'Scooter', displacement: '110cc' },
    JF50: { model: 'Vision 110', type: 'Scooter', displacement: '110cc' },
    JC61: { model: 'CB 150R', type: 'Naked Sport', displacement: '150cc' },
    KC11: { model: 'CB 300R', type: 'Naked Sport', displacement: '300cc' },
    JC92: { model: 'CBR 150R', type: 'Sport', displacement: '150cc' },
    JA10: { model: 'CB 125F / CB Shine', type: 'Commuter', displacement: '125cc' },
    JA44: { model: 'Wave 125i', type: 'Commuter', displacement: '125cc' },
    JA11: { model: 'Wave 110i / Dream', type: 'Commuter', displacement: '110cc' },
    KC13: { model: 'Hornet 2.0', type: 'Naked Sport', displacement: '200cc' },
    // Yamaha
    B3S: { model: 'NMAX 155', type: 'Scooter', displacement: '155cc' },
    '2SH': { model: 'FZ-S V2', type: 'Naked Sport', displacement: '150cc' },
    B6E: { model: 'R15 V3', type: 'Sport', displacement: '155cc' },
    // Suzuki
    CJ14: { model: 'Access 125', type: 'Scooter', displacement: '125cc' },
    // TVS
    ER3: { model: 'Apache RTR 160 4V', type: 'Sport', displacement: '160cc' },
    // Generic fallbacks
    GW5: { model: 'Gixxer 155', type: 'Naked Sport', displacement: '155cc' },
};

// ─────────────────────────────────────────────────────────────────────────────
// VIN Model Year — position 10 (index 9) of a 17-char VIN
// Skipping I, O, Q, U, Z and 0 per VIN standard
// ─────────────────────────────────────────────────────────────────────────────
const VIN_YEAR_TABLE = {
    A: [1980, 2010], B: [1981, 2011], C: [1982, 2012], D: [1983, 2013],
    E: [1984, 2014], F: [1985, 2015], G: [1986, 2016], H: [1987, 2017],
    J: [1988, 2018], K: [1989, 2019], L: [1990, 2020], M: [1991, 2021],
    N: [1992, 2022], P: [1993, 2023], R: [1994, 2024], S: [1995, 2025],
    T: [1996, 2026], V: [1997], W: [1998], X: [1999], Y: [2000],
    '1': [2001], '2': [2002], '3': [2003], '4': [2004], '5': [2005],
    '6': [2006], '7': [2007], '8': [2008], '9': [2009],
};

function resolveYear(yearCode) {
    const years = VIN_YEAR_TABLE[yearCode?.toUpperCase()];
    if (!years) return null;
    if (years.length === 1) return years[0];
    // Pick the more modern year (>= 2010 is likely for modern vehicles)
    const currentYear = new Date().getFullYear();
    return years.find(y => y <= currentYear && y >= 2000) ?? years[years.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine Decoder
// Engine No format: [MODEL_CODE][VARIANT][SERIAL]
// Example: JF98EW6093533 → model=JF98, variant=EW, serial=6093533
// ─────────────────────────────────────────────────────────────────────────────
export function decodeEngineNumber(engineNo) {
    if (!engineNo || engineNo.trim().length < 4) {
        return null;
    }
    const num = engineNo.trim().toUpperCase();

    // Try 4-char model codes
    for (const [code, info] of Object.entries(MODEL_CODE_TABLE)) {
        if (num.startsWith(code)) {
            const variant = num.slice(code.length, code.length + 2);
            const serial = num.slice(code.length + 2);
            return {
                modelCode: code,
                model: info.model,
                type: info.type,
                displacement: info.displacement,
                variant: variant || '—',
                serialNumber: serial || '—',
                raw: engineNo,
            };
        }
    }

    // Try 3-char model codes
    for (const [code, info] of Object.entries(MODEL_CODE_TABLE)) {
        if (code.length === 3 && num.startsWith(code)) {
            const serial = num.slice(3);
            return {
                modelCode: code,
                model: info.model,
                type: info.type,
                displacement: info.displacement,
                variant: '—',
                serialNumber: serial || '—',
                raw: engineNo,
            };
        }
    }

    return {
        modelCode: num.slice(0, 4),
        model: 'Unknown Model',
        type: '—',
        displacement: '—',
        variant: '—',
        serialNumber: num.slice(6),
        raw: engineNo,
        unknown: true,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// VIN / Chassis Decoder
// Standard 17-char VIN: WMI(1-3) + VDS(4-8) + CHECK(9) + YEAR(10) + PLANT(11) + SEQ(12-17)
// ─────────────────────────────────────────────────────────────────────────────
export function decodeChassisNumber(chassisNo) {
    if (!chassisNo || chassisNo.trim().length < 6) {
        return null;
    }
    const vin = chassisNo.trim().toUpperCase();

    const wmi = vin.slice(0, 3);
    const vds = vin.slice(3, 8);  // positions 4-8
    const checkDigit = vin[8] ?? '—';
    const yearCode = vin[9] ?? null;
    const plant = vin[10] ?? '—';
    const sequence = vin.slice(11) || '—';

    const wmiInfo = WMI_TABLE[wmi] ?? { manufacturer: 'Unknown Manufacturer', country: '—' };

    // Try to find model from VDS first 4 chars
    let modelInfo = null;
    for (const [code, info] of Object.entries(MODEL_CODE_TABLE)) {
        if (vds.startsWith(code) || vds.slice(0, code.length) === code) {
            modelInfo = info;
            break;
        }
    }

    const year = resolveYear(yearCode);

    return {
        wmi,
        manufacturer: wmiInfo.manufacturer,
        country: wmiInfo.country,
        vds,
        modelCode: vds.slice(0, 4),
        model: modelInfo?.model ?? 'Unknown Model',
        type: modelInfo?.type ?? '—',
        displacement: modelInfo?.displacement ?? '—',
        checkDigit,
        yearCode,
        year: year ?? '—',
        plant,
        sequenceNumber: sequence,
        isFullVin: vin.length === 17,
        raw: chassisNo,
    };
}
