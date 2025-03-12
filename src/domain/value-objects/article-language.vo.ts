import { z } from 'zod';

export enum LanguageEnum {
    English = 'en',
    French = 'fr',
    German = 'de',
    Spanish = 'es',
    Italian = 'it',
}

export const languageSchema = z.nativeEnum(LanguageEnum);

export class ArticleLanguage {
    private constructor(public readonly value: LanguageEnum) {}

    public static create(language: string): ArticleLanguage {
        const normalizedLanguage = language.toLowerCase() as LanguageEnum;
        const result = languageSchema.safeParse(normalizedLanguage);

        if (!result.success) {
            throw new Error(
                `Invalid language: ${language}. Supported languages are: ${Object.values(LanguageEnum).join(', ')}`,
            );
        }

        return new ArticleLanguage(result.data);
    }

    public equals(other: ArticleLanguage): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
