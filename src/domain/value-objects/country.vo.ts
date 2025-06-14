import { z } from 'zod/v4';

export const countrySchema = z.enum(['fr', 'de', 'it', 'es', 'uk', 'us']);

export type CountryEnum = z.infer<typeof countrySchema>;

export class Country {
    private constructor(public readonly value: CountryEnum) {}

    public static create(country: string): Country {
        const normalizedCountry = country.toLowerCase();
        const result = countrySchema.safeParse(normalizedCountry);

        if (!result.success) {
            throw new Error(
                `Invalid country: ${country}. Supported countries are: ${countrySchema.options.join(', ')}`,
            );
        }

        return new Country(result.data);
    }

    public toString(): string {
        return this.value;
    }
} 