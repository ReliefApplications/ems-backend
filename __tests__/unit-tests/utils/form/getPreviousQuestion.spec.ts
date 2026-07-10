import { getPreviousQuestion } from '@utils/form/getPreviousQuestion';

describe('getPreviousQuestion', () => {
  const page1 = {
    name: 'page1',
    elements: [
      { type: 'text', name: 'firstName', valueName: 'first_name' },
      { type: 'text', name: 'lastName', valueName: 'last_name' },
      { type: 'text', name: 'email', valueName: 'email' },
    ],
  };
  const structure = { pages: [page1] };

  it('returns the question preceding the given one', () => {
    expect(getPreviousQuestion(structure, 'last_name')).toMatchObject({
      name: 'firstName',
    });
    expect(getPreviousQuestion(structure, 'email')).toMatchObject({
      name: 'lastName',
    });
  });

  it('returns null when the question is the first of a pageless structure', () => {
    expect(getPreviousQuestion(page1, 'first_name')).toBeNull();
  });

  it('returns a falsy value when the question is the first one', () => {
    expect(getPreviousQuestion(structure, 'first_name')).toBeFalsy();
  });

  it('returns undefined when the question does not exist', () => {
    expect(getPreviousQuestion(structure, 'unknown')).toBeUndefined();
  });

  it('searches inside panels', () => {
    const withPanel = {
      pages: [
        {
          elements: [
            {
              type: 'panel',
              name: 'panel1',
              elements: [
                { type: 'text', name: 'a', valueName: 'a' },
                { type: 'text', name: 'b', valueName: 'b' },
              ],
            },
          ],
        },
      ],
    };
    expect(getPreviousQuestion(withPanel, 'b')).toMatchObject({ name: 'a' });
  });
});
