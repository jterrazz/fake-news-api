import { TZDate } from '@date-fns/tz';
import { format, subDays } from 'date-fns';

// TODO Only expose country codes and not the timezone identifiers

/**
 * Map of country codes to their timezone identifiers
 */
export const COUNTRY_TIMEZONES: Record<string, string> = {
    fr: 'Europe/Paris',
    us: 'America/New_York',
} as const;

export type CountryTimezone = keyof typeof COUNTRY_TIMEZONES;

/**
 * Creates a TZDate for the current time in a specific country's timezone
 */
export function createTZDateForCountry(date: Date | number, country: string): TZDate {
    const timezone = getTimezoneForCountry(country);
    return new TZDate(date instanceof Date ? date.getTime() : date, timezone);
}

/**
 * Formats a TZDate in a specific country's timezone using the provided format string
 * Note: The date must already be a TZDate. Use createTZDateForCountry for Date objects.
 */
export function formatTZDateInCountry(date: TZDate, country: string, formatStr: string): string {
    const timezone = getTimezoneForCountry(country);
    return format(date.withTimeZone(timezone), formatStr);
}

/**
 * Gets the current time for a specific country
 */
export function getCurrentTZDateForCountry(country: string): { hour: number; tzDate: TZDate } {
    const timezone = getTimezoneForCountry(country);
    const tzDate = new TZDate(Date.now(), timezone);
    return {
        hour: tzDate.getHours(),
        tzDate,
    };
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
    const timezone = COUNTRY_TIMEZONES[normalizedCode];

    if (!timezone) {
        throw new Error(
            `Unsupported country: ${countryCode}. Supported countries are: ${Object.keys(COUNTRY_TIMEZONES).join(', ')}`,
        );
    }

    return timezone;
}
