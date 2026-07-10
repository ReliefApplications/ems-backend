import { addField } from '@utils/form/addField';

/** Question factory to keep fixtures short. */
const question = (name: string) => ({ type: 'text', name, valueName: name });

/** Template holding the reference order of questions. */
const template = {
  pages: [
    { elements: [question('email'), question('phone'), question('age')] },
  ],
};

describe('addField', () => {
  it('inserts the question right after its template predecessor', () => {
    const structure = {
      pages: [{ elements: [question('email'), question('age')] }],
    };
    addField(structure, 'phone', template);
    expect(structure.pages[0].elements.map((x: any) => x.name)).toEqual([
      'email',
      'phone',
      'age',
    ]);
  });

  it('inserts the first template question before its template successor', () => {
    const structure = {
      pages: [{ elements: [question('phone'), question('age')] }],
    };
    addField(structure, 'email', template);
    expect(structure.pages[0].elements.map((x: any) => x.name)).toEqual([
      'email',
      'phone',
      'age',
    ]);
  });

  it('prepends to the first page when no sibling can be located', () => {
    const structure = {
      pages: [{ elements: [question('other')] }],
    };
    addField(structure, 'phone', template);
    expect(structure.pages[0].elements.map((x: any) => x.name)).toEqual([
      'phone',
      'other',
    ]);
  });

  it('prepends to the first page for a single-question template', () => {
    const singleTemplate = { pages: [{ elements: [question('lonely')] }] };
    const structure = { pages: [{ elements: [question('other')] }] };
    addField(structure, 'lonely', singleTemplate);
    expect(structure.pages[0].elements.map((x: any) => x.name)).toEqual([
      'lonely',
      'other',
    ]);
  });
});
