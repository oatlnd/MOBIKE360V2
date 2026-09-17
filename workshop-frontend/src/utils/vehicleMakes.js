/**
 * Vehicle Makes & Models Static Database
 * Covers motorcycles, scooters, three-wheelers and common cars serviced in workshops.
 * Each make has an "Other" model as the last option.
 */

export const VEHICLE_MAKES = [
    {
        id: 'honda',
        name: 'Honda',
        models: [
            'CB125R', 'CB150R', 'CB160R', 'CB190R', 'CB300R',
            'CBR150R', 'CBR250R', 'CBR300R', 'CBR500R', 'CBR600RR', 'CBR1000RR',
            'CB500F', 'CB500X', 'CB650F', 'CB650R', 'CB1000R',
            'CRF110F', 'CRF125F', 'CRF150R', 'CRF250R', 'CRF450R',
            'CG125', 'CD110 Dream', 'CD125',
            'Wave 110', 'Wave 125', 'Wave 150',
            'Dream Neo', 'Dream Yuga', 'Shine 125', 'Unicorn 150',
            'CB Hornet 160R', 'Livo 110', 'X-Blade 160',
            'Activa 110', 'Activa 125', 'Activa 6G',
            'PCX 125', 'PCX 150', 'PCX 160',
            'SH125', 'SH150', 'SH350i',
            'Dio 110', 'Grazia 125',
            'Gold Wing GL1800',
            'NC750X', 'NC750S',
            'NX500', 'Transalp XL750',
            'CMX300 Rebel', 'CMX500 Rebel', 'CMX1100 Rebel',
            'VFR800F', 'NT1100',
            'Civic', 'City', 'Accord', 'CR-V', 'HR-V', 'BR-V', 'Jazz',
            'Brio', 'WR-V', 'Pilot', 'Passport', 'Ridgeline', 'Odyssey',
            'Other',
        ],
    },
    {
        id: 'yamaha',
        name: 'Yamaha',
        models: [
            'YZF-R1', 'YZF-R3', 'YZF-R6', 'YZF-R7', 'YZF-R15', 'YZF-R25', 'YZF-R125',
            'MT-03', 'MT-07', 'MT-09', 'MT-10', 'MT-15', 'MT-125',
            'FZ-S FI', 'FZ-X', 'FZS 25', 'FZ1', 'FZ6', 'FZ8',
            'XSR125', 'XSR700', 'XSR900',
            'Ténéré 700', 'XT250', 'XT660',
            'YZ125', 'YZ250', 'YZ450F', 'WR450F',
            'Saluto 125', 'SZ-RR', 'Fazer 150',
            'NMax 125', 'NMax 155',
            'Xmax 250', 'Xmax 300', 'Xmax 400',
            'Aerox 155', 'Fino 125',
            'TMAX 560',
            'Tracer 7', 'Tracer 9',
            'V-MAX 1700',
            'Bolt (SCR950)', 'V-Star 250',
            'Other',
        ],
    },
    {
        id: 'suzuki',
        name: 'Suzuki',
        models: [
            'GSX-R125', 'GSX-R150', 'GSX-R250', 'GSX-R600', 'GSX-R750', 'GSX-R1000',
            'GSX-S125', 'GSX-S750', 'GSX-S1000',
            'GSX-8S', 'GSX-8R',
            'Gixxer 150', 'Gixxer SF 150', 'Gixxer 250', 'Gixxer SF 250',
            'Hayabusa (GSX1300R)',
            'SV650', 'SV650X',
            'V-Strom 250', 'V-Strom 650', 'V-Strom 1050',
            'DR-Z400SM',
            'Boulevard C50', 'Boulevard M109R',
            'Bandit 650', 'Bandit 1250',
            'Address 110', 'Burgman 125', 'Burgman 200', 'Burgman 400',
            'Access 125', 'Let\'s 110',
            'Swift', 'Baleno', 'Celerio', 'Alto', 'Wagon R',
            'S-Cross', 'Vitara', 'Jimny', 'Grand Vitara',
            'Dzire', 'Ertiga', 'XL6',
            'Other',
        ],
    },
    {
        id: 'bajaj',
        name: 'Bajaj',
        models: [
            'Pulsar 125', 'Pulsar 150', 'Pulsar 160NS', 'Pulsar 180', 'Pulsar 200NS',
            'Pulsar 220F', 'Pulsar N250', 'Pulsar RS200', 'Pulsar F250',
            'Dominar 250', 'Dominar 400',
            'Avenger Street 160', 'Avenger Street 220', 'Avenger Cruise 220',
            'Platina 100', 'Platina 110 H-Gear',
            'CT100', 'CT110',
            'Boxer 100', 'Boxer 150',
            'Chetak (Electric)',
            'KTM 125 Duke', 'KTM 200 Duke', 'KTM 250 Duke', 'KTM 390 Duke',
            'KTM 125 RC', 'KTM 390 RC',
            'Three Wheeler RE', 'Qute',
            'Other',
        ],
    },
    {
        id: 'tvs',
        name: 'TVS',
        models: [
            'Apache RTR 160', 'Apache RTR 160 4V', 'Apache RTR 200 4V', 'Apache RR 310',
            'Raider 125',
            'Star City+', 'Sport',
            'Jupiter 110', 'Jupiter 125',
            'Ntorq 125', 'iQube Electric',
            'XL100', 'XL Super HD',
            'Ronin 225',
            'Other',
        ],
    },
    {
        id: 'ktm',
        name: 'KTM',
        models: [
            '125 Duke', '200 Duke', '250 Duke', '390 Duke', '690 Duke', '890 Duke', '1290 Super Duke R',
            '125 RC', '200 RC', '390 RC',
            '250 Adventure', '390 Adventure', '490 Adventure', '890 Adventure',
            '250 EXC-F', '350 EXC-F', '450 EXC-F', '500 EXC-F',
            '250 SX-F', '350 SX-F', '450 SX-F',
            '890 SMT', '890 Super Moto R',
            'Other',
        ],
    },
    {
        id: 'kawasaki',
        name: 'Kawasaki',
        models: [
            'Ninja 125', 'Ninja 250', 'Ninja 300', 'Ninja 400', 'Ninja 650',
            'Ninja ZX-6R', 'Ninja ZX-10R', 'Ninja ZX-14R', 'Ninja H2',
            'Z125', 'Z250', 'Z400', 'Z650', 'Z900', 'Z1000',
            'Versys 300', 'Versys 650', 'Versys 1000',
            'KLX150', 'KLX230', 'KLX300',
            'KX65', 'KX85', 'KX250', 'KX450',
            'W175', 'W250', 'W800',
            'Vulcan 650', 'Vulcan S', 'Vulcan 900',
            'Eliminator 450',
            'Other',
        ],
    },
    {
        id: 'royal_enfield',
        name: 'Royal Enfield',
        models: [
            'Classic 350', 'Classic 500',
            'Bullet 350', 'Bullet 500',
            'Meteor 350',
            'Hunter 350',
            'Thunderbird 350X', 'Thunderbird 500X',
            'Himalayan 411', 'Himalayan 450',
            'Interceptor 650', 'Continental GT 650',
            'Super Meteor 650',
            'Guerrilla 450',
            'Other',
        ],
    },
    {
        id: 'hero',
        name: 'Hero',
        models: [
            'HF Deluxe', 'HF 100',
            'Splendor+ 100', 'Splendor iSmart',
            'Passion+ 110', 'Passion Pro',
            'Glamour 125',
            'Xtreme 125R', 'Xtreme 160R', 'Xtreme 200S',
            'XPulse 200', 'XPulse 200T', 'XPulse 200 4V',
            'Destini 125', 'Maestro Edge 125',
            'Pleasure+ 110',
            'Vida V1 (Electric)',
            'Other',
        ],
    },
    {
        id: 'toyota',
        name: 'Toyota',
        models: [
            'Corolla', 'Camry', 'Prius', 'Yaris', 'Vios', 'Avanza',
            'Hilux', 'Land Cruiser', 'Land Cruiser Prado', 'FJ Cruiser',
            'RAV4', 'Fortuner', 'Rush', 'Raize',
            'Innova', 'Innova Crysta',
            'Alphard', 'Vellfire',
            'Etios', 'Glanza',
            'C-HR', 'GR86', 'Supra',
            'Hiace', 'Granvia',
            'Other',
        ],
    },
    {
        id: 'nissan',
        name: 'Nissan',
        models: [
            'Sunny', 'Sentra', 'Altima', 'Maxima',
            'Navara', 'Frontier', 'Titan',
            'Pathfinder', 'X-Trail', 'Qashqai', 'Kicks', 'Juke',
            'Patrol', 'Terra', 'Murano',
            'Leaf', 'Ariya',
            'Serena', 'NV200',
            'GTR (R35)',
            'Other',
        ],
    },
    {
        id: 'mitsubishi',
        name: 'Mitsubishi',
        models: [
            'Lancer', 'Galant',
            'Outlander', 'Eclipse Cross', 'ASX',
            'Pajero', 'Pajero Sport', 'Montero',
            'L200 (Triton)', 'Strada',
            'Xpander', 'Mirage', 'Attrage',
            'Delica',
            'Colt Ralliart', 'Evo X',
            'Other',
        ],
    },
    {
        id: 'ford',
        name: 'Ford',
        models: [
            'Fiesta', 'Focus', 'Fusion', 'Mustang',
            'EcoSport', 'Escape', 'Edge', 'Explorer', 'Expedition',
            'Ranger', 'F-150', 'Bronco',
            'Everest', 'Territory',
            'Transit', 'Transit Connect',
            'Puma', 'Kuga',
            'Other',
        ],
    },
    {
        id: 'piaggio',
        name: 'Piaggio / Vespa',
        models: [
            'Vespa Sprint 125', 'Vespa GTS 150', 'Vespa GTS 300',
            'Vespa Primavera 125', 'Vespa Elegante 150',
            'Piaggio Liberty 125', 'Piaggio MP3 300', 'Piaggio MP3 500',
            'Ape City Goods', 'Ape HiTech',
            'Other',
        ],
    },
    {
        id: 'kymco',
        name: 'Kymco',
        models: [
            'Like 125', 'Like 150', 'Like 200i',
            'Agility 125', 'Agility 150',
            'People GT 125', 'People GT 200', 'People GT 300i',
            'Downtown 125i', 'Downtown 350i',
            'AK 550', 'CV3',
            'Super 8 125', 'Super 8 150',
            'Other',
        ],
    },
    {
        id: 'other_make',
        name: 'Other',
        models: ['Other'],
    },
];

/**
 * Get models for a specific make ID
 * @param {string} makeId
 * @returns {string[]}
 */
export function getModelsForMake(makeId) {
    const make = VEHICLE_MAKES.find(m => m.id === makeId);
    return make ? make.models : ['Other'];
}

/**
 * Get make display name by id
 * @param {string} makeId
 * @returns {string}
 */
export function getMakeName(makeId) {
    const make = VEHICLE_MAKES.find(m => m.id === makeId);
    return make ? make.name : makeId;
}
