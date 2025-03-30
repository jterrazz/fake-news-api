'use strict';

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
    /**
     * When true, all request headers except for those listed in attributes.exclude
     * will be captured for all traces, unless otherwise specified in a destination's
     * attributes include/exclude lists.
     */
    allow_all_headers: true,

    /**
     * Array of application names.
     */
    app_name: ['Fake News API'],

    attributes: {
        /**
         * Prefix of attributes to exclude from all destinations. Allows * as wildcard
         * at end.
         *
         * NOTE: If excluding headers, they must be in camelCase form to be filtered.
         */
        exclude: [
            'request.headers.cookie',
            'request.headers.authorization',
            'request.headers.proxyAuthorization',
            'request.headers.setCookie*',
            'request.headers.x*',
            'response.headers.cookie',
            'response.headers.authorization',
            'response.headers.proxyAuthorization',
            'response.headers.setCookie*',
            'response.headers.x*',
        ],
    },

    /**
     * Custom attributes configuration
     */
    custom_attributes: {
        enabled: true,
    },

    /**
     * Custom metrics configuration
     */
    custom_metrics: {
        enabled: true,
    },

    /**
     * Distributed tracing lets you see the path that a request takes through your distributed system.
     */
    distributed_tracing: {
        enabled: true,
    },

    /**
     * Your New Relic license key.
     */
    license_key: process.env.NEW_RELIC_LICENSE_KEY,

    logging: {
        /**
         * Level at which to log. 'trace' is most useful to New Relic when diagnosing
         * issues with the agent, 'info' and higher will impose the least overhead on
         * production applications.
         */
        level: 'info',
    },

    /**
     * Slow SQL monitoring
     */
    slow_sql: {
        enabled: true,
    },

    worker_threads: {
        enabled: true,
    },
};
