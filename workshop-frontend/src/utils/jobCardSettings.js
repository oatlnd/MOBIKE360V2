/**
 * Job Card Settings — localStorage-backed helpers for
 * Makes/Models and Purpose of Service / Requested Services.
 *
 * Keys:
 *   workshop_makes_models      → [{ id, make, models: [{ id, name }] }]
 *   workshop_service_purposes  → [{ id, name, services: [{ id, name, price }] }]
 */

const MAKES_KEY = 'workshop_makes_models';
const PURPOSES_KEY = 'workshop_service_purposes';

// ─────────────────────────────────────────────────────────────────────────────
// Default Data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MAKES = [
    {
        id: 'honda',
        make: 'Honda',
        models: [
            { id: 'h1', name: 'PCX 125' },
            { id: 'h2', name: 'PCX 150' },
            { id: 'h3', name: 'CB 150R' },
            { id: 'h4', name: 'CB 125F' },
            { id: 'h5', name: 'CBR 150R' },
            { id: 'h6', name: 'Wave 125i' },
            { id: 'h7', name: 'Dream 110' },
            { id: 'h8', name: 'Dio' },
            { id: 'h9', name: 'CB 300R' },
        ],
    },
    {
        id: 'yamaha',
        make: 'Yamaha',
        models: [
            { id: 'y1', name: 'FZ-S' },
            { id: 'y2', name: 'R15' },
            { id: 'y3', name: 'MT-15' },
            { id: 'y4', name: 'NMAX' },
            { id: 'y5', name: 'Mio' },
            { id: 'y6', name: 'Fino' },
            { id: 'y7', name: 'Aerox 155' },
        ],
    },
    {
        id: 'suzuki',
        make: 'Suzuki',
        models: [
            { id: 's1', name: 'GSX-R150' },
            { id: 's2', name: 'Gixxer 155' },
            { id: 's3', name: 'Access 125' },
            { id: 's4', name: 'Avenis 125' },
        ],
    },
    {
        id: 'tvs',
        make: 'TVS',
        models: [
            { id: 't1', name: 'Apache RTR 160' },
            { id: 't2', name: 'Apache RTR 200' },
            { id: 't3', name: 'Star City+' },
            { id: 't4', name: 'Radeon' },
        ],
    },
    {
        id: 'bajaj',
        make: 'Bajaj',
        models: [
            { id: 'b1', name: 'Pulsar NS160' },
            { id: 'b2', name: 'Pulsar NS200' },
            { id: 'b3', name: 'Platina 110' },
            { id: 'b4', name: 'CT100' },
        ],
    },
];

const DEFAULT_PURPOSES = [
    {
        id: 'gen_service',
        name: 'General Service',
        services: [
            { id: 'gs1', name: 'Engine Oil Change', price: 350 },
            { id: 'gs2', name: 'Oil Filter Replacement', price: 150 },
            { id: 'gs3', name: 'Air Filter Cleaning / Replacement', price: 200 },
            { id: 'gs4', name: 'Spark Plug Replacement', price: 100 },
            { id: 'gs5', name: 'Chain Lubrication & Adjustment', price: 150 },
        ],
    },
    {
        id: 'engine_repair',
        name: 'Engine Repair',
        services: [
            { id: 'er1', name: 'Engine Overhaul', price: 5000 },
            { id: 'er2', name: 'Piston Ring Replacement', price: 2500 },
            { id: 'er3', name: 'Head Gasket Replacement', price: 1800 },
            { id: 'er4', name: 'Valve Clearance Adjustment', price: 800 },
        ],
    },
    {
        id: 'tyre_service',
        name: 'Tyre Service',
        services: [
            { id: 'ts1', name: 'Front Tyre Replacement', price: 800 },
            { id: 'ts2', name: 'Rear Tyre Replacement', price: 900 },
            { id: 'ts3', name: 'Tyre Balancing', price: 200 },
            { id: 'ts4', name: 'Tube Repair / Patching', price: 150 },
        ],
    },
    {
        id: 'brake_service',
        name: 'Brake Service',
        services: [
            { id: 'bs1', name: 'Front Brake Pad Replacement', price: 600 },
            { id: 'bs2', name: 'Rear Brake Pad Replacement', price: 600 },
            { id: 'bs3', name: 'Brake Fluid Change', price: 300 },
            { id: 'bs4', name: 'Brake Disc Resurfacing', price: 750 },
        ],
    },
    {
        id: 'electrical',
        name: 'Electrical Service',
        services: [
            { id: 'el1', name: 'Battery Inspection & Service', price: 200 },
            { id: 'el2', name: 'Battery Replacement (Labour)', price: 150 },
            { id: 'el3', name: 'Wiring Repair', price: 1500 },
            { id: 'el4', name: 'Lights & Indicators Service', price: 400 },
            { id: 'el5', name: 'Starter Motor Service', price: 1200 },
        ],
    },
    {
        id: 'body_work',
        name: 'Body Work',
        services: [
            { id: 'bw1', name: 'Full Body Painting', price: 3000 },
            { id: 'bw2', name: 'Panel Repair / Dent Removal', price: 1500 },
            { id: 'bw3', name: 'Windscreen Replacement', price: 800 },
        ],
    },
    {
        id: 'inspection',
        name: 'Inspection / Diagnosis',
        services: [
            { id: 'in1', name: 'Full Vehicle Inspection', price: 500 },
            { id: 'in2', name: 'Pre-purchase Inspection', price: 750 },
            { id: 'in3', name: 'Diagnostic Fee', price: 300 },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Makes / Models API
// ─────────────────────────────────────────────────────────────────────────────
export function getMakesModels() {
    try {
        const raw = localStorage.getItem(MAKES_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_MAKES;
}

export function saveMakesModels(data) {
    localStorage.setItem(MAKES_KEY, JSON.stringify(data));
}

export function getMakesList() {
    return getMakesModels().map(m => ({ id: m.id, name: m.make }));
}

export function getModelsForMake(makeId) {
    const make = getMakesModels().find(m => m.id === makeId);
    return make?.models ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Purpose of Service / Requested Services API
// ─────────────────────────────────────────────────────────────────────────────
export function getServicePurposes() {
    try {
        const raw = localStorage.getItem(PURPOSES_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_PURPOSES;
}

export function saveServicePurposes(data) {
    localStorage.setItem(PURPOSES_KEY, JSON.stringify(data));
}

export function getServicesForPurpose(purposeId) {
    const purpose = getServicePurposes().find(p => p.id === purposeId);
    return purpose?.services ?? [];
}
