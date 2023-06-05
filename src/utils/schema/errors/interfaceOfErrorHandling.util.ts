/**
 * Check GraphQL Handling Error of data.
 * Throw GraphQL Handling Error than error message.
 */
export class GraphQLHandlingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphQLHandlingError';
  }
}
