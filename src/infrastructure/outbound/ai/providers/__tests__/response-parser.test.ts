import { describe, expect, it } from '@jterrazz/test';
import { z } from 'zod';

import { ResponseParser, ResponseParsingError } from '../response-parser.js';

// Test data
const testSchema = z.object({
    content: z.string(),
    tags: z.array(z.string()),
    title: z.string(),
});

const validJson = {
    content: 'Test content',
    tags: ['test', 'ai'],
    title: 'Test Article',
};

const validJsonString = JSON.stringify(validJson);

describe('ResponseParser', () => {
    describe('parse', () => {
        it('should parse valid JSON object', () => {
            // Given - a valid JSON object string
            const text = validJsonString;

            // When - parsing the string
            const result = ResponseParser.parse(text, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual(validJson);
        });

        it('should parse JSON object with surrounding text', () => {
            // Given - a JSON object string with surrounding text
            const text = `Here's the article: ${validJsonString} - end of article`;

            // When - parsing the string
            const result = ResponseParser.parse(text, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual(validJson);
        });

        it('should parse array response', () => {
            // Given - a JSON array string
            const arraySchema = z.array(z.string());
            const text = '["test", "ai", "content"]';

            // When - parsing the string
            const result = ResponseParser.parse(text, arraySchema);

            // Then - it should return the parsed array
            expect(result).toEqual(['test', 'ai', 'content']);
        });

        it('should parse primitive string value', () => {
            // Given - a JSON string value
            const text = '"test string"';

            // When - parsing the string
            const result = ResponseParser.parse(text, z.string());

            // Then - it should return the parsed string
            expect(result).toBe('test string');
        });

        it('should parse primitive number value', () => {
            // Given - a JSON string value
            const text = '42';

            // When - parsing the string
            const result = ResponseParser.parse(text, z.number());

            // Then - it should return the parsed number
            expect(result).toBe(42);
        });

        it('should parse primitive boolean value', () => {
            // Given - a JSON string value
            const text = 'true';

            // When - parsing the string
            const result = ResponseParser.parse(text, z.boolean());

            // Then - it should return the parsed boolean
            expect(result).toBe(true);
        });

        it('should parse primitive null value', () => {
            // Given - a JSON string value
            const text = 'null';

            // When - parsing the string
            const result = ResponseParser.parse(text, z.null());

            // Then - it should return the parsed null
            expect(result).toBeNull();
        });

        it('should throw ResponseParsingError when JSON is invalid', () => {
            // Given - an invalid JSON string
            const text = '{invalid json}';

            // When/Then - parsing the string should throw a ResponseParsingError
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when schema validation fails', () => {
            // Given - an invalid JSON object
            const invalidJson = {
                // Should be string
                content: 'Test content',
                tags: ['test', 'ai'],
                title: 123,
            };
            const text = JSON.stringify(invalidJson);

            // When/Then - parsing the string should throw a ResponseParsingError
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when no object found in text', () => {
            // Given - a text without a JSON object
            const text = 'No JSON object here';

            // When/Then - parsing the string should throw a ResponseParsingError
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when no array found in text', () => {
            // Given - a text without a JSON array
            const text = 'No array here';
            const arraySchema = z.array(z.string());

            // When/Then - parsing the string should throw a ResponseParsingError
            expect(() => ResponseParser.parse(text, arraySchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError for unsupported schema type', () => {
            // Given - a text with an unsupported schema type
            const text = 'test';
            const unsupportedSchema = z.union([z.string(), z.number()]);

            // When/Then - parsing the string should throw a ResponseParsingError
            expect(() => ResponseParser.parse(text, unsupportedSchema)).toThrow(
                ResponseParsingError,
            );
        });

        it('should include original text in error when parsing fails', () => {
            // Given - an invalid JSON string
            const text = '{invalid json}';

            // When - parsing the string
            try {
                ResponseParser.parse(text, testSchema);
                throw new Error('Should have thrown an error');
            } catch (error) {
                // Then - the error should include the original text
                expect(error).toBeInstanceOf(ResponseParsingError);
                expect((error as ResponseParsingError).text).toBe(text);
            }
        });

        it('should handle text with newlines in JSON object', () => {
            // Given - a JSON object with newlines
            const textWithNewlines = `{
                "content": "Test\ncontent\nwith\nnewlines",
                "tags": ["test", "ai"],
                "title": "Test\nArticle"
            }`;

            // When - parsing the string
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual({
                content: 'Test content with newlines',
                tags: ['test', 'ai'],
                title: 'Test Article',
            });
        });

        it('should handle text with newlines in surrounding text', () => {
            // Given - a text with newlines around the JSON object
            const textWithNewlines = `Here's the\narticle:\n${validJsonString}\n- end of\narticle`;

            // When - parsing the string
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual(validJson);
        });

        it('should handle text with multiple consecutive newlines and spaces', () => {
            // Given - a text with multiple consecutive newlines and spaces
            const textWithNewlines = `Here's the\n\n  article:   \n\n${validJsonString}\n\n`;

            // When - parsing the string
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual(validJson);
        });

        it('should handle escaped characters in JSON', () => {
            // Given - a JSON string with escaped characters
            const text =
                '{"content": "Test\\ncontent\\twith\\r\\nescapes", "tags": ["test\\u0020ai", "escaped\\"quotes\\""], "title": "Test\\\\Article"}';

            // When - parsing the string
            const result = ResponseParser.parse(text, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual({
                content: 'Test\ncontent\twith\r\nescapes',
                tags: ['test ai', 'escaped"quotes"'],
                title: 'Test\\Article',
            });
        });

        it('should handle escaped characters in markdown code blocks', () => {
            // Given - a markdown code block with escaped characters
            const text =
                '```json\n{"content": "Test\\nContent", "tags": ["test\\u0020ai"], "title": "Test\\\\Title"}\n```';

            // When - parsing the string
            const result = ResponseParser.parse(text, testSchema);

            // Then - it should return the parsed object
            expect(result).toEqual({
                content: 'Test\nContent',
                tags: ['test ai'],
                title: 'Test\\Title',
            });
        });

        it('should handle escaped characters in markdown code blocks', () => {
            // Given - a markdown code block with escaped characters
            const text =
                '```json\n [\n{"content": "Test\\nContent", "tags": ["test\\u0020ai"], "title": "Test\\\\Title"}\n]\n```';
            const arraySchema = z.array(testSchema);

            // When - parsing the string
            const result = ResponseParser.parse(text, arraySchema);

            // Then - it should return the parsed array
            expect(result).toEqual([
                {
                    content: 'Test\nContent',
                    tags: ['test ai'],
                    title: 'Test\\Title',
                },
            ]);
        });
    });
});
