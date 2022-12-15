import { validateApi } from '@utils/validators';
import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';

/**
 * Test API validator.
 */
describe('API validator tests', () => {
  describe('Correct api name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should pass', (string: string) => {
      const test = () => validateApi(string);
      expect(test).not.toThrow();
    });
  });

  describe('Incorrect api should throw error', () => {
    const strings = new Array(1).fill(faker.internet.email());
    test.each(strings)(
      'Name with @ or . should throw error',
      (name: string) => {
        const test = () => validateApi(name);
        expect(test).toThrow(GraphQLError);
      }
    );
  });
});
