/**
 * Returns the current request time as a formatted string.
 *
 * Useful for injecting timestamps into DynamoDB records or other
 * integration payloads built for a direct API Gateway service integration.
 *
 * @example
 * { date: getCurrentDate() }
 */
export const getCurrentDate = (): string => '$context.requestTimeEpoch';
