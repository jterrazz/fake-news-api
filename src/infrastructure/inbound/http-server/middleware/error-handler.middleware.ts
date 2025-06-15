import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Global error handling middleware for Hono
 * Catches all unhandled errors and returns appropriate HTTP responses
 */
export const errorHandlerMiddleware = async (err: Error, c: Context) => {
    console.error('Unexpected error in HTTP handler:', err);

    // Handle HTTP exceptions (like validation errors)
    if (err instanceof HTTPException) {
        return c.json({ error: err.message }, err.status);
    }

    // Handle all other errors as 500 Internal Server Error
    return c.json(
        {
            error: err instanceof Error ? err.message : 'Internal server error',
        },
        500,
    );
};
