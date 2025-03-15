/**
 * Database port - defines how to connect and disconnect from a database
 */
export interface DatabasePort {
    /**
     * Connect to the database
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the database
     */
    disconnect(): Promise<void>;

    article: {
        deleteMany: () => Promise<void>;
        // Add other methods as needed
    };
    // ... other collections
}
