import { TZDate } from '@date-fns/tz';
import { format, subDays } from 'date-fns';

/**
 * Map of country codes to their timezone identifiers
 * For countries with multiple timezones, we use either:
 * - The timezone of the main economic zone
 * - The timezone of the capital city
 * - The most populated timezone
 */
export const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
    ar: 'America/Buenos_Aires', // Argentina [Multi: using capital]
    at: 'Europe/Vienna', // Austria
    au: 'Australia/Sydney', // Australia [Multi: using main economic zone]
    be: 'Europe/Brussels', // Belgium
    br: 'America/Sao_Paulo', // Brazil [Multi: using main economic zone]
    ca: 'America/Toronto', // Canada [Multi: using main economic zone]
    ch: 'Europe/Zurich', // Switzerland
    cl: 'America/Santiago', // Chile [Multi: using capital]
    cn: 'Asia/Shanghai', // China [Multi: officially uses single timezone]
    co: 'America/Bogota', // Colombia
    cz: 'Europe/Prague', // Czech Republic
    de: 'Europe/Berlin', // Germany
    dk: 'Europe/Copenhagen', // Denmark
    eg: 'Africa/Cairo', // Egypt
    es: 'Europe/Madrid', // Spain (mainland) [Multi: +Canary Islands]
    fi: 'Europe/Helsinki', // Finland
    fr: 'Europe/Paris', // France (mainland) [Multi: overseas territories]
    gb: 'Europe/London', // United Kingdom
    gr: 'Europe/Athens', // Greece
    hk: 'Asia/Hong_Kong', // Hong Kong
    hu: 'Europe/Budapest', // Hungary
    id: 'Asia/Jakarta', // Indonesia [Multi: using capital]
    ie: 'Europe/Dublin', // Ireland
    in: 'Asia/Kolkata', // India [Multi: uses single timezone nationally]
    it: 'Europe/Rome', // Italy
    jp: 'Asia/Tokyo', // Japan
    ke: 'Africa/Nairobi', // Kenya
    kr: 'Asia/Seoul', // South Korea
    ma: 'Africa/Casablanca', // Morocco
    mx: 'America/Mexico_City', // Mexico [Multi: using capital]
    my: 'Asia/Kuala_Lumpur', // Malaysia [Multi: using main peninsula]
    ng: 'Africa/Lagos', // Nigeria
    nl: 'Europe/Amsterdam', // Netherlands
    no: 'Europe/Oslo', // Norway
    nz: 'Pacific/Auckland', // New Zealand [Multi: using main island]
    pe: 'America/Lima', // Peru
    ph: 'Asia/Manila', // Philippines
    pl: 'Europe/Warsaw', // Poland
    pt: 'Europe/Lisbon', // Portugal (mainland) [Multi: Azores, Madeira]
    ro: 'Europe/Bucharest', // Romania
    ru: 'Europe/Moscow', // Russia [Multi: using capital]
    se: 'Europe/Stockholm', // Sweden
    sg: 'Asia/Singapore', // Singapore
    th: 'Asia/Bangkok', // Thailand
    tw: 'Asia/Taipei', // Taiwan
    us: 'America/New_York', // USA [Multi: using main economic zone/EST]
    uy: 'America/Montevideo', // Uruguay
    vn: 'Asia/Ho_Chi_Minh', // Vietnam
    za: 'Africa/Johannesburg', // South Africa
} as const;

export type CountryTimezone = keyof typeof COUNTRY_TIMEZONE_MAP;

/**
 * Creates a TZDate for the current time in a specific country's timezone
 */
export function createCurrentTZDateForCountry(country: string): TZDate {
    const timezone = getTimezoneForCountry(country);
    return new TZDate(Date.now(), timezone);
}

/**
 * Creates a TZDate for a specific date in a country's timezone
 */
export function createTZDateForCountry(date: Date | number, country: string): TZDate {
    const timezone = getTimezoneForCountry(country);
    return new TZDate(date instanceof Date ? date.getTime() : date, timezone);
}

/**
 * Formats a TZDate in a specific country's timezone using the provided format string
 * Note: The date must already be a TZDate. Use createTZDateForCountry for Date objects.
 */
export function formatTZDateForCountry(date: TZDate, country: string, formatStr: string): string {
    const timezone = getTimezoneForCountry(country);
    return format(date.withTimeZone(timezone), formatStr);
}

/**
 * Subtracts days from a date while preserving timezone
 */
export function subtractDays(date: TZDate, days: number): TZDate {
    const subtractedDate = subDays(date, days);
    return new TZDate(subtractedDate.getTime(), date.timeZone);
}

/**
 * Gets the timezone for a country code
 * @throws Error if country code is not supported
 */
function getTimezoneForCountry(countryCode: string): string {
    const normalizedCode = countryCode.toLowerCase() as CountryTimezone;
    const timezone = COUNTRY_TIMEZONE_MAP[normalizedCode];

    if (!timezone) {
        throw new Error(
            `Unsupported country: ${countryCode}. Supported countries are: ${Object.keys(COUNTRY_TIMEZONE_MAP).join(', ')}`,
        );
    }

    return timezone;
}
