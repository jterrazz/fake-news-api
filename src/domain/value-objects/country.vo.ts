import { z } from 'zod/v4';

export const countrySchema = z
    .enum(['fr', 'us', 'global'])
    .describe(
        "Identifies the target countries where the story is relevant and should be surfaced. Use a two-letter ISO code for specific countries. The value 'global' is for stories with broad international relevance and should not be combined with other country codes.",
    );

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
