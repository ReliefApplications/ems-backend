import { removeField } from '@utils/form/removeField';

/** Builds a fresh structure for each test, since removeField mutates it. */
const buildStructure = () => ({
  pages: [
    {
      name: 'page1',
      elements: [
        { type: 'text', name: 'firstName', valueName: 'first_name' },
        {
          type: 'panel',
          name: 'infoPanel',
          elements: [
            { type: 'text', name: 'city', valueName: 'city' },
            { type: 'text', name: 'zip', valueName: 'zip' },
          ],
        },
        { type: 'text', name: 'lastName', valueName: 'last_name' },
      ],
    },
  ],
});

describe('removeField', () => {
  it('removes a top-level question and returns true', () => {
    const structure = buildStructure();
    expect(removeField(structure, 'first_name')).toBe(true);
    expect(
      structure.pages[0].elements.map((x: any) => x.name)
    ).toEqual(['infoPanel', 'lastName']);
  });

  it('removes a question nested in a panel', () => {
    const structure = buildStructure();
    expect(removeField(structure, 'zip')).toBe(true);
    const panel: any = structure.pages[0].elements[1];
    expect(panel.elements.map((x: any) => x.name)).toEqual(['city']);
  });

  it('leaves the structure untouched when the field does not exist', () => {
    const structure = buildStructure();
    expect(removeField(structure, 'unknown')).toBeFalsy();
    expect(structure).toEqual(buildStructure());
  });
});
