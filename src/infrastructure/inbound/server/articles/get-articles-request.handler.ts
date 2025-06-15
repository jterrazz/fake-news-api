import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

import { Category, categorySchema } from '../../../../domain/value-objects/category.vo.js';
import { Country, countrySchema } from '../../../../domain/value-objects/country.vo.js';
import { Language, languageSchema } from '../../../../domain/value-objects/language.vo.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Raw HTTP query parameters from the request
 */
export interface GetArticlesHttpQuery {
    category?: string;
    country?: string;
    cursor?: string;
    language?: string;
    limit?: string;
}

/**
 * Validates and transforms a category string to a Category domain object
 */
const categoryParamSchema = z
    .string()
    .optional()
    .transform((val) => val?.toLowerCase())
    .pipe(categorySchema.optional())
    .transform((val) => (val ? new Category(val) : undefined));

/**
 * Validates and transforms a country string to a Country domain object
 * Defaults to 'us' if not specified
 */
const countryParamSchema = z
    .string()
    .optional()
    .transform((val) => val?.toLowerCase() || 'us') // Default to 'us' if not provided
    .pipe(countrySchema)
    .transform((val) => new Country(val));

/**
 * Validates and transforms a language string to a Language domain object
 */
const languageParamSchema = z
    .string()
    .optional()
    .transform((val) => val?.toLowerCase())
    .pipe(languageSchema.optional())
    .transform((val) => (val ? new Language(val) : undefined));

/**
 * Validates and transforms a cursor string to a Date object
 */
const cursorParamSchema = z
    .string()
    .optional()
    .refine(
        (cursor) => {
            if (!cursor) return true;

            try {
                const decodedString = Buffer.from(cursor, 'base64').toString();
                const timestamp = Number(decodedString);
                return !isNaN(timestamp);
            } catch {
                return false;
            }
        },
        {
            message: 'Invalid cursor format',
        },
    )
    .transform((cursor) => {
        if (!cursor) return undefined;

        const decodedString = Buffer.from(cursor, 'base64').toString();
        const timestamp = Number(decodedString);
        return new Date(timestamp);
    });

/**
 * Validates and transforms limit parameter with default value
 */
const limitParamSchema = z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
        if (val === undefined) return DEFAULT_PAGE_SIZE;
        return typeof val === 'string' ? Number(val) : val;
    })
    .pipe(z.number().min(1).max(MAX_PAGE_SIZE));

/**
 * Schema for validating HTTP input parameters for GET /articles endpoint
 * Transforms raw input directly to domain value objects
 */
const getArticlesParamsSchema = z.object({
    category: categoryParamSchema,
    country: countryParamSchema,
    cursor: cursorParamSchema,
    language: languageParamSchema,
    limit: limitParamSchema,
});

export type GetArticlesHttpParams = z.infer<typeof getArticlesParamsSchema>;

/**
 * Handles HTTP request validation and transformation for GET /articles endpoint
 * Transforms raw HTTP input to validated domain objects
 */
export class GetArticlesRequestHandler {
    /**
     * Validates and transforms raw HTTP query parameters to domain objects
     *
     * @param rawQuery - Raw HTTP query parameters
     * @returns Validated and transformed parameters
     * @throws HTTPException with 422 status for validation errors
     */
    handle(rawQuery: GetArticlesHttpQuery): GetArticlesHttpParams {
        const validatedParams = getArticlesParamsSchema.safeParse(rawQuery);

        if (!validatedParams.success) {
            throw new HTTPException(422, {
                cause: { details: validatedParams.error.issues },
                message: 'Invalid request parameters',
            });
        }

        return validatedParams.data;
    }
}
