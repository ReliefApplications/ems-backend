import getFieldName from '@utils/schema/introspection/getFieldName';

describe('getFieldName', () => {
  it('returns the plain name for simple fields', () => {
    expect(getFieldName({ name: 'status', type: 'text' } as any)).toBe(
      'status'
    );
  });

  it('replaces dashes with underscores and trims', () => {
    expect(getFieldName({ name: ' my-field-name ', type: 'text' } as any)).toBe(
      'my_field_name'
    );
  });

  it('appends _id for resource fields', () => {
    expect(
      getFieldName({ name: 'parent', type: 'resource', resource: 'x' } as any)
    ).toBe('parent_id');
  });

  it('appends _ids for resources fields', () => {
    expect(
      getFieldName({ name: 'children', type: 'resources', resource: 'x' } as any)
    ).toBe('children_ids');
  });

  it('appends _ref for reference data fields', () => {
    expect(
      getFieldName({
        name: 'country',
        type: 'dropdown',
        referenceData: { id: 'x' },
      } as any)
    ).toBe('country_ref');
  });
});
