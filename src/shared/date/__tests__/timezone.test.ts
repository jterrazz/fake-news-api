import { TZDate } from '@date-fns/tz';

import {
    COUNTRY_TIMEZONES,
    createTZDateForCountry,
    formatTZDateInCountry,
    getCurrentTZDateForCountry,
    subtractDays,
} from '../timezone.js';

describe('Timezone Utilities', () => {
    const originalDate = new Date('2024-01-01T12:30:45.123Z');
    const parisTimezone = 'Europe/Paris';

    beforeEach(() => {
        jest.useFakeTimers({
            doNotFake: ['nextTick', 'setImmediate'],
            now: originalDate,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getCurrentTZDateForCountry', () => {
        it.each([
            { country: 'fr', expectedHour: 13 }, // UTC+1 for Paris
            { country: 'us', expectedHour: 7 }, // UTC-5 for New York
        ])('should return correct hour for $country', ({ country, expectedHour }) => {
            // When
            const { hour, tzDate } = getCurrentTZDateForCountry(country);

            // Then
            expect(hour).toBe(expectedHour);
            expect(tzDate).toBeInstanceOf(TZDate);
            expect(tzDate.timeZone).toBe(COUNTRY_TIMEZONES[country]);
            expect(tzDate.getTime()).toBe(originalDate.getTime());
        });

        it('should throw error for unsupported country', () => {
            // When/Then
            expect(() => getCurrentTZDateForCountry('invalid')).toThrow(
                'Unsupported country: invalid. Supported countries are: fr, us',
            );
        });

        it('should handle uppercase country codes', () => {
            // When
            const { hour, tzDate } = getCurrentTZDateForCountry('FR');

            // Then
            expect(hour).toBe(13); // UTC+1 for Paris
            expect(tzDate.timeZone).toBe(parisTimezone);
        });
    });

    describe('createTZDateForCountry', () => {
        it.each([
            { country: 'fr', timezone: 'Europe/Paris' },
            { country: 'us', timezone: 'America/New_York' },
        ])('should create TZDate with correct timezone for $country', ({ country, timezone }) => {
            // Given
            const date = new Date('2024-01-01T12:30:00Z');

            // When
            const tzDate = createTZDateForCountry(date, country);

            // Then
            expect(tzDate).toBeInstanceOf(TZDate);
            expect(tzDate.timeZone).toBe(timezone);
            expect(tzDate.getTime()).toBe(date.getTime());
        });

        it('should handle Date objects and timestamps', () => {
            // Given
            const date = new Date('2024-01-01T12:30:00Z');
            const timestamp = date.getTime();

            // When
            const tzDateFromDate = createTZDateForCountry(date, 'fr');
            const tzDateFromTimestamp = createTZDateForCountry(timestamp, 'fr');

            // Then
            expect(tzDateFromDate.getTime()).toBe(tzDateFromTimestamp.getTime());
            expect(tzDateFromDate.timeZone).toBe(tzDateFromTimestamp.timeZone);
        });

        it('should throw error for unsupported country', () => {
            // Given
            const date = new Date();

            // When/Then
            expect(() => createTZDateForCountry(date, 'invalid')).toThrow(
                'Unsupported country: invalid. Supported countries are: fr, us',
            );
        });
    });

    describe('formatTZDateInCountry', () => {
        it.each([
            { expected: '06:30', fromCountry: 'fr', toCountry: 'us' }, // Paris -> New York (UTC+1 -> UTC-5)
            { expected: '18:30', fromCountry: 'us', toCountry: 'fr' }, // New York -> Paris (UTC-5 -> UTC+1)
            { expected: '12:30', fromCountry: 'fr', toCountry: 'fr' }, // Paris -> Paris (no change)
        ])(
            'should format time from $fromCountry timezone to $toCountry timezone',
            ({ expected, fromCountry, toCountry }) => {
                // Given
                const tzDate = new TZDate(2024, 0, 1, 12, 30, 0, 0, COUNTRY_TIMEZONES[fromCountry]);

                // When
                const formatted = formatTZDateInCountry(tzDate, toCountry, 'HH:mm');

                // Then
                expect(formatted).toBe(expected);
            },
        );

        it('should handle uppercase country codes', () => {
            // Given
            const tzDate = new TZDate(2024, 0, 1, 12, 30, 0, 0, parisTimezone);

            // When
            const formatted = formatTZDateInCountry(tzDate, 'FR', 'HH:mm');

            // Then
            expect(formatted).toBe('12:30');
        });

        it('should throw error for unsupported country', () => {
            // Given
            const tzDate = new TZDate(2024, 0, 1, 12, 30, 0, 0, parisTimezone);

            // When/Then
            expect(() => formatTZDateInCountry(tzDate, 'invalid', 'HH:mm')).toThrow(
                'Unsupported country: invalid. Supported countries are: fr, us',
            );
        });
    });

    describe('subtractDays', () => {
        it('should subtract days while preserving timezone', () => {
            // Given
            const date = new TZDate(2024, 0, 15, 12, 0, 0, 0, parisTimezone);

            // When
            const result = subtractDays(date, 5);

            // Then
            expect(result).toBeInstanceOf(TZDate);
            expect(result.timeZone).toBe(parisTimezone);
            expect(result.getDate()).toBe(10);
        });

        it('should handle month/year boundaries', () => {
            // Given
            const date = new TZDate(2024, 0, 1, 12, 0, 0, 0, parisTimezone);

            // When
            const result = subtractDays(date, 2);

            // Then
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(11); // December
            expect(result.getDate()).toBe(30);
        });

        it('should preserve time components', () => {
            // Given
            const date = new TZDate(2024, 0, 15, 14, 30, 45, 123, parisTimezone);

            // When
            const result = subtractDays(date, 5);

            // Then
            expect(result.getHours()).toBe(14); // UTC+1 for Paris
            expect(result.getMinutes()).toBe(30);
            expect(result.getSeconds()).toBe(45);
            expect(result.getMilliseconds()).toBe(123);
        });
    });
});
