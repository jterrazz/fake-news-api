import { z } from 'zod/v4';

export const countrySchema = z.enum(['fr', 'us', 'global']);

export type CountryEnum = z.infer<typeof countrySchema>;

export class Country {
    public readonly value: CountryEnum;

    constructor(country: string) {
        const normalizedCountry = country.toLowerCase();
        const result = countrySchema.safeParse(normalizedCountry);

        if (!result.success) {
            throw new Error(
                `Invalid country: ${country}. Supported countries are: ${countrySchema.options.join(', ')}`,
            );
        }

        this.value = result.data;
    }

    public isGlobal(): boolean {
        return this.value === 'global';
    }

    public toString(): CountryEnum {
        return this.value;
    }
}
