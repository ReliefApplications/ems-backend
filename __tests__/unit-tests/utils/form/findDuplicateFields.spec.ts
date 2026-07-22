import { GraphQLError } from 'graphql';
import { findDuplicateFields } from '@utils/form/findDuplicateFields';

// Mock i18next translation
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

describe('findDuplicateFields', () => {
  it('does not throw when all field names are unique', () => {
    const fields = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    expect(() => findDuplicateFields(fields)).not.toThrow();
  });

  it('does not throw for an empty list', () => {
    expect(() => findDuplicateFields([])).not.toThrow();
  });

  it('throws a GraphQLError when a name is duplicated', () => {
    const fields = [{ name: 'a' }, { name: 'b' }, { name: 'a' }];
    expect(() => findDuplicateFields(fields)).toThrow(GraphQLError);
  });
});
