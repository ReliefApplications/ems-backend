import { getNextQuestion } from '@utils/form/getNextQuestion';

describe('getNextQuestion', () => {
  const page1 = {
    name: 'page1',
    elements: [
      { type: 'text', name: 'firstName', valueName: 'first_name' },
      { type: 'text', name: 'lastName', valueName: 'last_name' },
      { type: 'text', name: 'email', valueName: 'email' },
    ],
  };
  const structure = { pages: [page1] };

  it('returns the question following the given one', () => {
    expect(getNextQuestion(structure, 'first_name')).toMatchObject({
      name: 'lastName',
    });
    expect(getNextQuestion(structure, 'last_name')).toMatchObject({
      name: 'email',
    });
  });

  it('returns null when the question is the last of a pageless structure', () => {
    expect(getNextQuestion(page1, 'email')).toBeNull();
  });

  it('returns a falsy value when the question is the last one', () => {
    expect(getNextQuestion(structure, 'email')).toBeFalsy();
  });

  it('returns undefined when the question does not exist', () => {
    expect(getNextQuestion(structure, 'unknown')).toBeUndefined();
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
    expect(getNextQuestion(withPanel, 'a')).toMatchObject({ name: 'b' });
  });
});
