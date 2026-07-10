import { replaceField } from '@utils/form/replaceField';

/** Question factory to keep fixtures short. */
const question = (name: string, extra: Record<string, any> = {}) => ({
  type: 'text',
  name,
  valueName: name,
  ...extra,
});

describe('replaceField', () => {
  it('replaces the field by the reference structure version', () => {
    const edited = {
      pages: [{ elements: [question('status', { title: 'Old title' })] }],
    };
    const reference = {
      pages: [{ elements: [question('status', { title: 'New title' })] }],
    };
    const prevReference = {
      pages: [{ elements: [question('status', { title: 'Old title' })] }],
    };

    expect(replaceField('status', edited, reference, prevReference)).toBe(true);
    expect(edited.pages[0].elements[0]).toMatchObject({ title: 'New title' });
  });

  it('keeps a locally overridden defaultValue', () => {
    const edited = {
      pages: [{ elements: [question('status', { defaultValue: 'local' })] }],
    };
    const reference = {
      pages: [
        {
          elements: [
            question('status', { title: 'New title', defaultValue: 'core-v2' }),
          ],
        },
      ],
    };
    const prevReference = {
      pages: [{ elements: [question('status', { defaultValue: 'core-v1' })] }],
    };

    expect(replaceField('status', edited, reference, prevReference)).toBe(true);
    expect(edited.pages[0].elements[0]).toMatchObject({
      title: 'New title',
      defaultValue: 'local',
    });
  });

  it('adopts the new default when the local default matched the previous core one', () => {
    const edited = {
      pages: [{ elements: [question('status', { defaultValue: 'core-v1' })] }],
    };
    const reference = {
      pages: [{ elements: [question('status', { defaultValue: 'core-v2' })] }],
    };
    const prevReference = {
      pages: [{ elements: [question('status', { defaultValue: 'core-v1' })] }],
    };

    expect(replaceField('status', edited, reference, prevReference)).toBe(true);
    expect(edited.pages[0].elements[0]).toMatchObject({
      defaultValue: 'core-v2',
    });
  });

  it('replaces a field nested in a panel', () => {
    const edited = {
      pages: [
        {
          elements: [
            {
              type: 'panel',
              name: 'panel1',
              elements: [question('status', { title: 'Old title' })],
            },
          ],
        },
      ],
    };
    const reference = {
      pages: [{ elements: [question('status', { title: 'New title' })] }],
    };
    const prevReference = {
      pages: [{ elements: [question('status', { title: 'Old title' })] }],
    };

    expect(replaceField('status', edited, reference, prevReference)).toBe(true);
    const panel: any = edited.pages[0].elements[0];
    expect(panel.elements[0]).toMatchObject({ title: 'New title' });
  });

  it('returns a falsy value when the field does not exist', () => {
    const edited = { pages: [{ elements: [question('other')] }] };
    const reference = { pages: [{ elements: [question('status')] }] };
    expect(replaceField('status', edited, reference, reference)).toBeFalsy();
  });
});
