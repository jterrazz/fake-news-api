import { z } from 'zod';
import { describe, it, expect } from 'vitest';

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
            // Given
            const text = validJsonString;

            // When
            const result = ResponseParser.parse(text, testSchema);

            // Then
            expect(result).toEqual(validJson);
        });

        it('should parse JSON object with surrounding text', () => {
            // Given
            const text = `Here's the article: ${validJsonString} - end of article`;

            // When
            const result = ResponseParser.parse(text, testSchema);

            // Then
            expect(result).toEqual(validJson);
        });

        it('should parse array response', () => {
            // Given
            const arraySchema = z.array(z.string());
            const text = '["test", "ai", "content"]';

            // When
            const result = ResponseParser.parse(text, arraySchema);

            // Then
            expect(result).toEqual(['test', 'ai', 'content']);
        });

        it('should parse primitive string value', () => {
            // Given
            const text = '"test string"';

            // When
            const result = ResponseParser.parse(text, z.string());

            // Then
            expect(result).toBe('test string');
        });

        it('should parse primitive number value', () => {
            // Given
            const text = '42';

            // When
            const result = ResponseParser.parse(text, z.number());

            // Then
            expect(result).toBe(42);
        });

        it('should parse primitive boolean value', () => {
            // Given
            const text = 'true';

            // When
            const result = ResponseParser.parse(text, z.boolean());

            // Then
            expect(result).toBe(true);
        });

        it('should parse primitive null value', () => {
            // Given
            const text = 'null';

            // When
            const result = ResponseParser.parse(text, z.null());

            // Then
            expect(result).toBeNull();
        });

        it('should throw ResponseParsingError when JSON is invalid', () => {
            // Given
            const text = '{invalid json}';

            // When/Then
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when schema validation fails', () => {
            // Given
            const invalidJson = {
                // Should be string
                content: 'Test content',
                tags: ['test', 'ai'],
                title: 123,
            };
            const text = JSON.stringify(invalidJson);

            // When/Then
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when no object found in text', () => {
            // Given
            const text = 'No JSON object here';

            // When/Then
            expect(() => ResponseParser.parse(text, testSchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError when no array found in text', () => {
            // Given
            const text = 'No array here';
            const arraySchema = z.array(z.string());

            // When/Then
            expect(() => ResponseParser.parse(text, arraySchema)).toThrow(ResponseParsingError);
        });

        it('should throw ResponseParsingError for unsupported schema type', () => {
            // Given
            const text = 'test';
            const unsupportedSchema = z.union([z.string(), z.number()]);

            // When/Then
            expect(() => ResponseParser.parse(text, unsupportedSchema)).toThrow(
                ResponseParsingError,
            );
        });

        it('should include original text in error when parsing fails', () => {
            // Given
            const text = '{invalid json}';

            // When
            try {
                ResponseParser.parse(text, testSchema);
                throw new Error('Should have thrown an error');
            } catch (error) {
                // Then
                expect(error).toBeInstanceOf(ResponseParsingError);
                expect((error as ResponseParsingError).text).toBe(text);
            }
        });

        it('should handle text with newlines in JSON object', () => {
            // Given
            const textWithNewlines = `{
                "content": "Test\ncontent\nwith\nnewlines",
                "tags": ["test", "ai"],
                "title": "Test\nArticle"
            }`;

            // When
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then
            expect(result).toEqual({
                content: 'Test content with newlines',
                tags: ['test', 'ai'],
                title: 'Test Article',
            });
        });

        it('should handle text with newlines in surrounding text', () => {
            // Given
            const textWithNewlines = `Here's the\narticle:\n${validJsonString}\n- end of\narticle`;

            // When
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then
            expect(result).toEqual(validJson);
        });

        it('should handle text with multiple consecutive newlines and spaces', () => {
            // Given
            const textWithNewlines = `Here's the\n\n  article:   \n\n${validJsonString}\n\n`;

            // When
            const result = ResponseParser.parse(textWithNewlines, testSchema);

            // Then
            expect(result).toEqual(validJson);
        });

        it('should handle escaped characters in JSON', () => {
            // Given
            const text =
                '{"content": "Test\\ncontent\\twith\\r\\nescapes", "tags": ["test\\u0020ai", "escaped\\"quotes\\""], "title": "Test\\\\Article"}';

            // When
            const result = ResponseParser.parse(text, testSchema);

            // Then
            expect(result).toEqual({
                content: 'Test\ncontent\twith\r\nescapes',
                tags: ['test ai', 'escaped"quotes"'],
                title: 'Test\\Article',
            });
        });

        it('should handle escaped characters in markdown code blocks', () => {
            // Given
            const text =
                '```json\n{"content": "Test\\nContent", "tags": ["test\\u0020ai"], "title": "Test\\\\Title"}\n```';

            // When
            const result = ResponseParser.parse(text, testSchema);

            // Then
            expect(result).toEqual({
                content: 'Test\nContent',
                tags: ['test ai'],
                title: 'Test\\Title',
            });
        });

        it('should handle escaped characters in markdown code blocks', () => {
            // Given
            const text =
                '```json\n [\n{"content": "Test\\nContent", "tags": ["test\\u0020ai"], "title": "Test\\\\Title"}\n]\n```';
            const arraySchema = z.array(testSchema);

            // When
            const result = ResponseParser.parse(text, arraySchema);

            // Then
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
