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
    test.each(name)('Random api name should return true', (name: string) => {
      expect(getGraphQLTypeName(name)).toEqual(
        camelCase(name).replace(/^(.)/, toUpper)
      );
    });
  });

  describe('Correct name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (name: string) => {
      expect(validateGraphQLTypeName(getGraphQLTypeName(name))).toEqual(
        undefined
      );
    });
  });

  describe('Correct field name should return true', () => {
    const name = new Array(100).fill(faker.word.adjective());
    test.each(name)('Random api name should return true', (name: string) => {
      expect(validateGraphQLFieldName(name)).toEqual(undefined);
    });
  });
});
