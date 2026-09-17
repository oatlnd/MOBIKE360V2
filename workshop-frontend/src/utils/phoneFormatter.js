/**
 * Sri Lankan Phone Number Formatter
 * Standardises input numbers to "+94 7X XXX XXXX" format
 * Supported inputs:
 *  - "0771234567" -> "+94 77 123 4567"
 *  - "771234567" -> "+94 77 123 4567"
 *  - "+94771234567" -> "+94 77 123 4567"
 */
export function formatSriLankanPhone(value) {
    if (!value) return '';
    
    // Remove all non-digit characters except '+'
    let cleaned = value.replace(/[^\d+]/g, '');

    // Convert local zero to +94 prefix
    if (cleaned.startsWith('0')) {
        cleaned = '+94' + cleaned.substring(1);
    } else if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) {
        cleaned = '+94' + cleaned;
    } else if (cleaned.startsWith('94') && cleaned.length === 11) {
        cleaned = '+' + cleaned;
    }

    // Apply spacing format if matches +94 7X XXX XXXX structure (11 digits plus '+')
    if (cleaned.startsWith('+94') && cleaned.length === 12) {
        const prefix = cleaned.substring(0, 3); // +94
        const operator = cleaned.substring(3, 5); // 7X
        const group1 = cleaned.substring(5, 8); // XXX
        const group2 = cleaned.substring(8, 12); // XXXX
        return `${prefix} ${operator} ${group1} ${group2}`;
    }

    return value;
}
