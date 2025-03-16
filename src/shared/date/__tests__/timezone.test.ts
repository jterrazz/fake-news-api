import { TZDate } from '@date-fns/tz';

import {
    COUNTRY_TIMEZONES,
    createCurrentTZDate,
    createTZDate,
    formatInTimezone,
    getCurrentHourInTimezone,
    getTimezoneForCountry,
    subtractDaysInTimezone,
} from '../timezone.js';

describe('Timezone Utilities', () => {
    const originalDate = new Date('2024-01-01T12:30:45.123Z');
    const parisTimezone = 'Europe/Paris';
    const newYorkTimezone = 'America/New_York';

    beforeEach(() => {
        // Use modern fake timers that allow async operations
        jest.useFakeTimers({
            doNotFake: ['nextTick', 'setImmediate'],
            now: originalDate,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('createTZDate', () => {
        it('should create a TZDate with the correct timezone', () => {
            // Given
            const date = new Date('2024-01-01T12:00:00Z');

            // When
            const tzDate = createTZDate(date, parisTimezone);

            // Then
            expect(tzDate).toBeInstanceOf(TZDate);
            // Verify timezone offset is correct for Paris (UTC+1)
            expect(formatInTimezone(tzDate, parisTimezone, 'xxx')).toBe('+01:00');
            expect(tzDate.timeZone).toBe(parisTimezone);
        });

        it('should preserve all date components', () => {
            // Given
            const date = new Date(2024, 0, 1, 12, 30, 45, 123);

            // When
            const tzDate = createTZDate(date, parisTimezone);

            // Then
            expect(tzDate.getFullYear()).toBe(2024);
            expect(tzDate.getMonth()).toBe(0);
            expect(tzDate.getDate()).toBe(1);
            expect(tzDate.getHours()).toBe(12);
            expect(tzDate.getMinutes()).toBe(30);
            expect(tzDate.getSeconds()).toBe(45);
            expect(tzDate.getMilliseconds()).toBe(123);
        });
    });

    describe('createCurrentTZDate', () => {
        it('should create a TZDate with current time', () => {
            // When
            const tzDate = createCurrentTZDate(parisTimezone);

            // Then
            expect(tzDate).toBeInstanceOf(TZDate);
            // Verify timezone offset is correct for Paris (UTC+1)
            expect(formatInTimezone(tzDate, parisTimezone, 'xxx')).toBe('+01:00');
            expect(tzDate.timeZone).toBe(parisTimezone);
            expect(tzDate.getTime()).toBe(originalDate.getTime());
        });
    });

    describe('getTimezoneForCountry', () => {
        it.each(Object.entries(COUNTRY_TIMEZONES))(
            'should return correct timezone for %s',
            (countryCode, expectedTimezone) => {
                // When
                const timezone = getTimezoneForCountry(countryCode);

                // Then
                expect(timezone).toBe(expectedTimezone);
            },
        );

        it('should handle uppercase country codes', () => {
            // When
            const timezone = getTimezoneForCountry('FR');

            // Then
            expect(timezone).toBe(parisTimezone);
        });

        it('should throw error for unsupported country', () => {
            // When/Then
            expect(() => getTimezoneForCountry('invalid')).toThrow(
                'Unsupported country: invalid. Supported countries are: fr, us',
            );
        });
    });

    describe('getCurrentHourInTimezone', () => {
        it.each([
            { expectedHour: 13, timezone: parisTimezone }, // UTC+1
            { expectedHour: 7, timezone: newYorkTimezone }, // UTC-5
        ])('should return correct hour for $timezone', ({ timezone, expectedHour }) => {
            // Given
            const fixedDate = new Date('2024-01-01T12:00:00Z'); // Noon UTC
            jest.setSystemTime(fixedDate);

            // When
            const hour = getCurrentHourInTimezone(timezone);

            // Then
            expect(hour).toBe(expectedHour);
        });
    });

    describe('formatInTimezone', () => {
        it('should format Date object in specified timezone', () => {
            // Given
            const date = new Date('2024-01-01T12:00:00Z');

            // When
            const formatted = formatInTimezone(date, parisTimezone, 'HH:mm');

            // Then
            expect(formatted).toBe('13:00');
        });

        it('should format TZDate in specified timezone', () => {
            // Given
            const tzDate = new TZDate(2024, 0, 1, 12, 0, 0, 0, parisTimezone);

            // When
            const formatted = formatInTimezone(tzDate, parisTimezone, 'HH:mm');

            // Then
            expect(formatted).toBe('12:00');
        });
    });

    describe('subtractDaysInTimezone', () => {
        it('should subtract days while preserving timezone', () => {
            // Given
            const date = new Date('2024-01-15T12:00:00Z');

            // When
            const result = subtractDaysInTimezone(date, parisTimezone, 5);

            // Then
            expect(result).toBeInstanceOf(TZDate);
            expect(result.timeZone).toBe(parisTimezone);
            expect(result.getDate()).toBe(10);
        });

        it('should handle month/year boundaries', () => {
            // Given
            const date = new Date('2024-01-01T12:00:00Z');

            // When
            const result = subtractDaysInTimezone(date, parisTimezone, 2);

            // Then
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(11); // December
            expect(result.getDate()).toBe(30);
        });

        it('should preserve time components', () => {
            // Given
            const date = new Date('2024-01-15T14:30:45.123Z');

            // When
            const result = subtractDaysInTimezone(date, parisTimezone, 5);

            // Then
            expect(result.getHours()).toBe(15); // UTC+1 for Paris
            expect(result.getMinutes()).toBe(30);
            expect(result.getSeconds()).toBe(45);
            expect(result.getMilliseconds()).toBe(123);
        });
    });
});
