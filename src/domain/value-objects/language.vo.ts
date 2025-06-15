import { z } from 'zod/v4';

export const languageSchema = z.enum(['en', 'fr']);

export type LanguageEnum = z.infer<typeof languageSchema>;

export class Language {
    public readonly value: LanguageEnum;

    constructor(language: string) {
        const normalizedLanguage = language.toLowerCase();
        const result = languageSchema.safeParse(normalizedLanguage);

        if (!result.success) {
            throw new Error(
                `Invalid language: ${language}. Supported languages are: ${languageSchema.options.join(', ')}`,
            );
        }

        this.value = result.data;
    }

    public toString(): LanguageEnum {
        return this.value;
    }
}
