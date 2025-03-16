import { z } from 'zod';

/**
 * Custom error for response parsing failures
 */
export class ResponseParsingError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
        public readonly text?: string,
    ) {
        super(message);
        this.name = 'ResponseParsingError';
    }
}

/**
 * Parses AI response text into structured data based on Zod schema
 */
export class ResponseParser {
    /**
     * Parses the AI response text based on the expected schema type
     */
    public static parse<T>(text: string, schema: z.ZodSchema<T>): T {
        try {
            const cleanedText = this.cleanText(text);
            const json = this.extractJsonFromText(cleanedText, schema);
            const unescapedJson = this.unescapeJsonValues(json);
            return schema.parse(unescapedJson);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ResponseParsingError(
                    'Failed to validate response against schema',
                    error,
                    text,
                );
            }
            throw error;
        }
    }

    /**
     * Extracts and parses JSON from text based on schema type
     */
    private static extractJsonFromText(text: string, schema: z.ZodSchema): unknown {
        if (schema instanceof z.ZodArray) {
            return this.extractArray(text);
        }

        if (schema instanceof z.ZodObject) {
            return this.extractObject(text);
        }

        if (
            schema instanceof z.ZodString ||
            schema instanceof z.ZodNumber ||
            schema instanceof z.ZodBoolean ||
            schema instanceof z.ZodNull
        ) {
            return this.extractPrimitive(text, schema);
        }

        throw new ResponseParsingError('Unsupported schema type', undefined, text);
    }

    /**
     * Extracts array from text
     */
    private static extractArray(text: string): unknown {
        const arrayStart = text.indexOf('[');
        const arrayEnd = text.lastIndexOf(']');
        if (arrayStart === -1 || arrayEnd === -1) {
            throw new ResponseParsingError('No array found in response', undefined, text);
        }
        try {
            return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
        } catch (error) {
            throw new ResponseParsingError('Failed to parse array JSON', error, text);
        }
    }

    /**
     * Extracts object from text
     */
    private static extractObject(text: string): unknown {
        const objectStart = text.indexOf('{');
        const objectEnd = text.lastIndexOf('}');
        if (objectStart === -1 || objectEnd === -1) {
            throw new ResponseParsingError('No object found in response', undefined, text);
        }
        try {
            return JSON.parse(text.slice(objectStart, objectEnd + 1));
        } catch (error) {
            throw new ResponseParsingError('Failed to parse object JSON', error, text);
        }
    }

    /**
     * Extracts and converts primitive value from text
     */
    private static extractPrimitive(text: string, schema: z.ZodType): unknown {
        const trimmed = text.trim();

        // Try to parse as JSON first in case it's quoted
        try {
            const parsed = JSON.parse(trimmed);
            return this.convertToPrimitive(parsed, schema);
        } catch {
            // If not valid JSON, use the raw string
            return this.convertToPrimitive(trimmed, schema);
        }
    }

    /**
     * Converts value to appropriate primitive type based on schema
     */
    private static convertToPrimitive(value: unknown, schema: z.ZodType): unknown {
        if (schema instanceof z.ZodString) {
            return String(value);
        }
        if (schema instanceof z.ZodNumber) {
            return Number(value);
        }
        if (schema instanceof z.ZodBoolean) {
            return Boolean(value);
        }
        if (schema instanceof z.ZodNull) {
            return null;
        }
        return value;
    }

    /**
     * Unescapes common escaped characters in text
     */
    private static unescapeText(text: string): string {
        return text
            .replace(/\\"/g, '"') // Unescape quotes
            .replace(/\\n/g, '\n') // Unescape newlines
            .replace(/\\r/g, '\r') // Unescape carriage returns
            .replace(/\\t/g, '\t') // Unescape tabs
            .replace(/\\\\/g, '\\') // Unescape backslashes
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16))); // Unescape unicode
    }

    /**
     * Recursively unescapes all string values in a JSON object/array
     */
    private static unescapeJsonValues(json: unknown): unknown {
        if (typeof json === 'string') {
            return this.unescapeText(json);
        }
        if (Array.isArray(json)) {
            return json.map((item) => this.unescapeJsonValues(item));
        }
        if (typeof json === 'object' && json !== null) {
            return Object.fromEntries(
                Object.entries(json).map(([key, value]) => [key, this.unescapeJsonValues(value)]),
            );
        }
        return json;
    }

    /**
     * Cleans text by removing newlines and extra whitespace
     */
    private static cleanText(text: string): string {
        // Extract content from markdown code blocks if present
        const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            text = codeBlockMatch[1];
        }

        return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
}
