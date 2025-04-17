import { z } from 'zod';

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
     * Cleans text and finds the largest schema-compatible structure
     */
    private static cleanText(text: string): string {
        // First try to extract from markdown code blocks
        const codeBlocks = text.match(/```(?:json)?\r?\n([^`]*?)\r?\n```/g);
        if (codeBlocks) {
            // Try each code block and return the largest valid one
            const validBlocks = codeBlocks
                .map((block) => this.extractJsonFromCodeBlock(block))
                .filter((block): block is string => block !== null);

            if (validBlocks.length > 0) {
                return this.findLargestString(validBlocks);
            }
        }

        // If no valid code blocks, try to find JSON-like structures in the text
        const jsonMatches = this.findJsonStructures(text);
        if (jsonMatches.length > 0) {
            return this.findLargestString(jsonMatches);
        }

        // If no JSON structures found, clean and return the original text
        return text.replace(/\s+/g, ' ').trim();
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
     * Extracts and validates JSON content from a code block
     */
    private static extractJsonFromCodeBlock(block: string): null | string {
        const content = block.replace(/```(?:json)?\r?\n([^`]*?)\r?\n```/, '$1').trim();
        try {
            // Attempt to parse as JSON to validate structure
            JSON.parse(content);
            return content;
        } catch {
            return null;
        }
    }

    /**
     * Extracts and parses JSON from text based on schema type
     */
    // TODO Does not support when a transform is used
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
     * Finds valid JSON structures in raw text
     */
    private static findJsonStructures(text: string): string[] {
        const jsonMatches: string[] = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '{' || char === '[') {
                if (depth === 0) start = i;
                depth++;
            } else if (char === '}' || char === ']') {
                depth--;
                if (depth === 0 && start !== -1) {
                    const potentialJson = text.slice(start, i + 1);
                    try {
                        JSON.parse(potentialJson);
                        jsonMatches.push(potentialJson);
                    } catch {
                        // Invalid JSON, ignore
                    }
                }
            }
        }

        return jsonMatches;
    }

    /**
     * Returns the largest string from an array of strings
     */
    private static findLargestString(strings: string[]): string {
        return strings.reduce(
            (largest, current) => (current.length > largest.length ? current : largest),
            strings[0],
        );
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
}

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
