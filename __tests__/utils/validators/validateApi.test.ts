import { validateApi } from '@utils/validators';
import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Test API validator.
 */
describe('API validator tests', () => {
  describe('Correct api name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should pass', (string: string) => {
      expect(validateApi(string)).toEqual(undefined);
    });
  });

  describe('Incorrect api should throw error', () => {
    const strings = new Array(1).fill(faker.internet.email());
    test.each(strings)(
      'Name with @ or . should throw error',
      (name: string) => {
        expect(() => validateApi(name)).toThrowError(
          new GraphQLError(i18next.t('errors.invalidGraphQLName'))
        );
      }
    );
  });
});
