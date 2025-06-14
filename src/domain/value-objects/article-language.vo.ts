import { z } from 'zod/v4';

export const languageSchema = z.enum(['en', 'fr', 'de', 'it', 'es']);

export type LanguageEnum = z.infer<typeof languageSchema>;

export class ArticleLanguage {
    private constructor(public readonly value: LanguageEnum) {}

    public static create(language: string): ArticleLanguage {
        const normalizedLanguage = language.toLowerCase();
        const result = languageSchema.safeParse(normalizedLanguage);

        if (!result.success) {
            throw new Error(
                `Invalid language: ${language}. Supported languages are: ${languageSchema.options.join(', ')}`,
            );
        }

        return new ArticleLanguage(result.data);
    }

    public toString(): string {
        return this.value;
    }
}
