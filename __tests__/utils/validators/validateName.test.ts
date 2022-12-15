import {
  getGraphQLTypeName,
  validateGraphQLTypeName,
  validateGraphQLFieldName,
} from '@utils/validators';
import { faker } from '@faker-js/faker';
import { camelCase, toUpper } from 'lodash';

/**
 * Test Name validator.
 */
describe('Name validator tests', () => {
  describe('GraphQL type name of random string should return camel case string', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)(
      'Random world should return camel case string',
      (string: string) => {
        expect(getGraphQLTypeName(string)).toEqual(
          camelCase(string).replace(/^(.)/, toUpper)
        );
      }
    );
  });

  describe('Validation of correct GraphQL type name should pass', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)(
      'Random GraphQL type name should pass',
      (string: string) => {
        expect(validateGraphQLTypeName(getGraphQLTypeName(string))).toEqual(
          undefined
        );
      }
    );
  });

  describe('Validation of random string without any special character should pass', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random string should pass', (string: string) => {
      expect(validateGraphQLFieldName(string)).toEqual(undefined);
    });
  });
});
