import { TZDate } from '@date-fns/tz';
import { format, subDays } from 'date-fns';

export { TZDate };

/**
 * Map of country codes to their timezone identifiers
 */
export const COUNTRY_TIMEZONES: Record<string, string> = {
    fr: 'Europe/Paris',
    us: 'America/New_York',
} as const;

export type CountryTimezone = keyof typeof COUNTRY_TIMEZONES;

/**
 * Creates a timezone-aware date from a regular Date object
 */
export function createTZDate(date: Date, timezone: string): TZDate {
    return new TZDate(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
        timezone,
    );
}

/**
 * Creates a timezone-aware date for the current time
 */
export function createCurrentTZDate(timezone: string): TZDate {
    return createTZDate(new Date(), timezone);
}

/**
 * Gets the timezone for a country code
 * @throws Error if country code is not supported
 */
export function getTimezoneForCountry(countryCode: string): string {
    const normalizedCode = countryCode.toLowerCase() as CountryTimezone;
    const timezone = COUNTRY_TIMEZONES[normalizedCode];

    if (!timezone) {
        throw new Error(
            `Unsupported country: ${countryCode}. Supported countries are: ${Object.keys(COUNTRY_TIMEZONES).join(', ')}`,
        );
    }

    return timezone;
}

/**
 * Gets the current hour in a specific timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
    const now = new Date();
    // Create a TZDate directly from UTC timestamp to ensure correct timezone conversion
    const tzDate = new TZDate(now.getTime(), timezone);
    return tzDate.getHours();
}

/**
 * Formats a date in a specific timezone using the provided format string
 */
export function formatInTimezone(date: Date | TZDate, timezone: string, formatStr: string): string {
    const tzDate = date instanceof TZDate ? date : createTZDate(date, timezone);
    return format(tzDate, formatStr);
}

/**
 * Subtracts days from a date in a specific timezone
 */
export function subtractDaysInTimezone(
    date: Date | TZDate,
    timezone: string,
    days: number,
): TZDate {
    const tzDate = date instanceof TZDate ? date : createTZDate(date, timezone);
    return createTZDate(subDays(tzDate, days), timezone);
}
