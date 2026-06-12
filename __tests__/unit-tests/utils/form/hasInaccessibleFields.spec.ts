import { hasInaccessibleFields } from '@utils/form';
import { Record, Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';

describe('hasInaccessibleFields', () => {
  const mockAbility = (cannotUpdateFields: string[] = []): AppAbility =>
    ({
      cannot: jest.fn(
        (action: string, subject: any, field?: string) =>
          action === 'update' &&
          field &&
          cannotUpdateFields.some((inaccessibleField) =>
            field.endsWith(inaccessibleField)
          )
      ),
    } as any);

  const resource: Resource = {
    id: 'resource1',
    name: 'Test Resource',
    fields: [{ name: 'field1' }, { name: 'field2' }, { name: 'dateField' }],
  } as any;

  const record: Record = {
    id: 'record1',
    resourceId: 'resource1',
    data: {
      field1: 'value1',
      field2: 'value2',
      dateField: new Date('2023-01-01T00:00:00.000Z'),
    },
  } as any;

  it('should return false if no fields are updated', () => {
    const newData = {
      field1: 'value1',
      field2: 'value2',
    };
    const ability = mockAbility();
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return false if an accessible field is updated', () => {
    const newData = {
      field1: 'new value',
    };
    const ability = mockAbility(['field2']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return true if an inaccessible field is updated', () => {
    const newData = {
      field1: 'new value',
    };
    const ability = mockAbility(['field1']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      true
    );
  });

  it('should return true if a mix of accessible and inaccessible fields are updated', () => {
    const newData = {
      field1: 'new value',
      field2: 'new value2',
    };
    const ability = mockAbility(['field1']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      true
    );
  });

  it('should return false if a field not in the resource is updated', () => {
    const newData = {
      nonExistentField: 'some value',
    };
    const ability = mockAbility(['nonExistentField']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return false when updating a date field with the same date value', () => {
    const newData = {
      dateField: new Date('2023-01-01T00:00:00.000Z'),
    };
    const ability = mockAbility();
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return true when updating a date field with a new date and no permission', () => {
    const newData = {
      dateField: new Date('2023-01-02T00:00:00.000Z'),
    };
    const ability = mockAbility(['dateField']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      true
    );
  });

  it('should return false when adding a new accessible field', () => {
    const localRecord: Record = {
      ...record,
      data: { field2: 'value2' },
    } as any;
    const newData = {
      field1: 'new value',
    };
    const ability = mockAbility(['field2']);
    expect(hasInaccessibleFields(localRecord, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return true when adding a new inaccessible field', () => {
    const localRecord: Record = {
      ...record,
      data: { field2: 'value2' },
    } as any;
    const newData = {
      field1: 'new value',
    };
    const ability = mockAbility(['field1']);
    expect(hasInaccessibleFields(localRecord, newData, ability, resource)).toBe(
      true
    );
  });

  it('should return false when a field is removed from the data', () => {
    const newData = {
      field2: 'value2',
    };
    const ability = mockAbility(['field1']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      false
    );
  });

  it('should return true when a field value is changed to undefined', () => {
    const newData = {
      field1: undefined,
      field2: 'value2',
    };
    const ability = mockAbility(['field1']);
    expect(hasInaccessibleFields(record, newData, ability, resource)).toBe(
      true
    );
  });
});
