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

  it('keeps the outdated files display option set on the child form', () => {
    const edited = {
      pages: [
        {
          elements: [
            question('documents', { type: 'file', showOutdatedFiles: true }),
          ],
        },
      ],
    };
    const reference = {
      pages: [
        {
          elements: [
            question('documents', {
              type: 'file',
              title: 'New title',
              allowOutdatedFiles: true,
              showOutdatedFiles: false,
            }),
          ],
        },
      ],
    };
    const prevReference = {
      pages: [
        {
          elements: [
            question('documents', {
              type: 'file',
              allowOutdatedFiles: true,
              showOutdatedFiles: false,
            }),
          ],
        },
      ],
    };

    expect(replaceField('documents', edited, reference, prevReference)).toBe(
      true
    );
    expect(edited.pages[0].elements[0]).toMatchObject({
      title: 'New title',
      allowOutdatedFiles: true,
      showOutdatedFiles: true,
    });
  });

  it('follows the core outdated files display option when the child did not customize it', () => {
    const edited = {
      pages: [
        {
          elements: [
            question('documents', { type: 'file', showOutdatedFiles: false }),
          ],
        },
      ],
    };
    const reference = {
      pages: [
        {
          elements: [
            question('documents', { type: 'file', showOutdatedFiles: true }),
          ],
        },
      ],
    };
    const prevReference = {
      pages: [
        {
          elements: [
            question('documents', { type: 'file', showOutdatedFiles: false }),
          ],
        },
      ],
    };

    expect(replaceField('documents', edited, reference, prevReference)).toBe(
      true
    );
    expect(edited.pages[0].elements[0]).toMatchObject({
      showOutdatedFiles: true,
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
