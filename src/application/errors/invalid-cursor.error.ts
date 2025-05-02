/**
 * Error thrown when the pagination cursor is invalid.
 */
export class InvalidCursorError extends Error {
    constructor(message: string = 'Invalid cursor') {
        super(message);
        this.name = 'InvalidCursorError';
    }
}
