import {
  getGraphQLTypeName,
  validateGraphQLTypeName,
  validateGraphQLFieldName,
} from '@utils/validators';
import { faker } from '@faker-js/faker';
import { camelCase, toUpper } from 'lodash';
import { GraphQLError } from 'graphql';
import protectedNames from '@const/protectedNames';

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
        const test = () => validateGraphQLTypeName(getGraphQLTypeName(string));
        expect(test).not.toThrow();
      }
    );
  });

  describe('Validation of random string without any special character should pass', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random string should pass', (string: string) => {
      const test = () => validateGraphQLFieldName(string);
      expect(test).not.toThrow();
    });
  });

  describe('Validation of random string with any special character should fail', () => {
    const strings = new Array(1).fill(faker.internet.email());
    test.each(strings)('Random email should fail', (string: string) => {
      const test = () => validateGraphQLFieldName(string);
      expect(test).toThrow(GraphQLError);
    });
    test.each(strings)('Random email should fail', (string: string) => {
      const test = () => validateGraphQLTypeName(string);
      expect(test).toThrow(GraphQLError);
    });
  });

  describe('Validation of protected name should fail', () => {
    test.each(protectedNames)('Protected name should fail', (name: string) => {
      const test = () => validateGraphQLTypeName(name);
      expect(test).toThrow(GraphQLError);
    });
  });
});
