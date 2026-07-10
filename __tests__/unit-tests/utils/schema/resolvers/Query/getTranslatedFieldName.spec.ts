import getTranslatedFieldName from '@utils/schema/resolvers/Query/getTranslatedFieldName';

describe('getTranslatedFieldName', () => {
  const fields = [
    { name: 'title' },
    { name: 'title_es', translateField: 'title', translateTo: 'es' },
    { name: 'title_fr', translateField: 'title', translateTo: 'FR' },
    { name: 'body_es', translateField: 'body', translateTo: 'es' },
  ];

  it('should return the sibling field name when a translation exists for the locale', () => {
    expect(getTranslatedFieldName('title', fields, 'es')).toBe('title_es');
  });

  it('should match the locale case-insensitively', () => {
    expect(getTranslatedFieldName('title', fields, 'ES')).toBe('title_es');
    expect(getTranslatedFieldName('title', fields, 'fr')).toBe('title_fr');
  });

  it('should return the original field name when no translation matches the locale', () => {
    expect(getTranslatedFieldName('title', fields, 'de')).toBe('title');
  });

  it('should return the original field name when the source field has no siblings', () => {
    expect(getTranslatedFieldName('description', fields, 'es')).toBe(
      'description'
    );
  });

  it('should return the original field name when no locale is provided', () => {
    expect(getTranslatedFieldName('title', fields)).toBe('title');
    expect(getTranslatedFieldName('title', fields, '')).toBe('title');
    expect(getTranslatedFieldName('title', fields, undefined)).toBe('title');
  });

  it('should return the original field name when fields is not provided', () => {
    expect(getTranslatedFieldName('title', undefined as any, 'es')).toBe(
      'title'
    );
    expect(getTranslatedFieldName('title', null as any, 'es')).toBe('title');
  });

  it('should ignore falsy entries in the fields array', () => {
    const fieldsWithNulls = [
      null,
      undefined,
      { name: 'title_es', translateField: 'title', translateTo: 'es' },
    ];
    expect(
      getTranslatedFieldName('title', fieldsWithNulls as any, 'es')
    ).toBe('title_es');
  });

  it('should ignore siblings that have a matching translateField but no translateTo', () => {
    const fieldsMissingLocale = [
      { name: 'title_x', translateField: 'title' },
    ];
    expect(
      getTranslatedFieldName('title', fieldsMissingLocale as any, 'es')
    ).toBe('title');
  });

  it('should not match a sibling whose translateField targets a different source field', () => {
    expect(getTranslatedFieldName('title', fields, 'es')).not.toBe('body_es');
  });

  it('should return the first matching sibling when several match the locale', () => {
    const duplicateFields = [
      { name: 'title_es_1', translateField: 'title', translateTo: 'es' },
      { name: 'title_es_2', translateField: 'title', translateTo: 'es' },
    ];
    expect(getTranslatedFieldName('title', duplicateFields, 'es')).toBe(
      'title_es_1'
    );
  });
});
