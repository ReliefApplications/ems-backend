import { GraphQLError } from 'graphql';
import { checkDefaultFields } from '@utils/form/checkDefaultFields';
import { defaultRecordFieldsFlat } from '@const/defaultRecordFields';

// Mock i18next translation
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

describe('checkDefaultFields', () => {
  it('does not throw when no field uses a default record field name', () => {
    const fields = [{ name: 'firstName' }, { name: 'city' }];
    expect(() => checkDefaultFields(fields)).not.toThrow();
  });

  it('does not throw for an empty list', () => {
    expect(() => checkDefaultFields([])).not.toThrow();
  });

  it('throws a GraphQLError when a field reuses a default record field name', () => {
    const reservedName = defaultRecordFieldsFlat[0];
    const fields = [{ name: 'firstName' }, { name: reservedName }];
    expect(() => checkDefaultFields(fields)).toThrow(GraphQLError);
  });
});
