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
  describe('check get type name should be return correct name', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (string: string) => {
      expect(getGraphQLTypeName(string)).toEqual(
        camelCase(string).replace(/^(.)/, toUpper)
      );
    });
  });

  describe('Correct name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (string: string) => {
      expect(validateGraphQLTypeName(getGraphQLTypeName(string))).toEqual(
        undefined
      );
    });
  });

  describe('Correct field name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (string: string) => {
      expect(validateGraphQLFieldName(string)).toEqual(undefined);
    });
  });
});
