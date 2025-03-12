import { z } from 'zod';

export enum CountryEnum {
    UnitedStates = 'us',
    UnitedKingdom = 'uk',
    France = 'fr',
    Germany = 'de',
    Spain = 'es',
    Italy = 'it',
}

export const countrySchema = z.nativeEnum(CountryEnum);

export class ArticleCountry {
    private constructor(public readonly value: CountryEnum) {}

    public static create(country: string): ArticleCountry {
        const normalizedCountry = country.toLowerCase() as CountryEnum;
        const result = countrySchema.safeParse(normalizedCountry);

        if (!result.success) {
            throw new Error(
                `Invalid country: ${country}. Supported countries are: ${Object.values(CountryEnum).join(', ')}`,
            );
        }

        return new ArticleCountry(result.data);
    }

    public equals(other: ArticleCountry): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
