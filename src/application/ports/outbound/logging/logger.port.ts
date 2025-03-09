/**
 * Logger port - defines how to log messages with different severity levels
 */
export interface LoggerPort {
    /**
     * Log an informational message
     */
    info(message: string, context?: Record<string, unknown>): void;

    /**
     * Log an error message
     */
    error(message: string, context?: Record<string, unknown>): void;

    /**
     * Log a warning message
     */
    warn(message: string, context?: Record<string, unknown>): void;

    /**
     * Log a debug message
     */
    debug(message: string, context?: Record<string, unknown>): void;
}
