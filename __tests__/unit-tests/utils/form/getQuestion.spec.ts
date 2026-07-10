import { getQuestion } from '@utils/form/getQuestion';

describe('getQuestion', () => {
  const structure = {
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
      {
        name: 'page2',
        elements: [{ type: 'comment', name: 'notes', valueName: 'notes' }],
      },
    ],
  };

  it('finds a top-level question by its valueName', () => {
    const question = getQuestion(structure, 'first_name');
    expect(question).toMatchObject({ name: 'firstName' });
  });

  it('finds a question nested inside a panel', () => {
    const question = getQuestion(structure, 'zip');
    expect(question).toMatchObject({ name: 'zip' });
  });

  it('finds a question on a later page', () => {
    const question = getQuestion(structure, 'notes');
    expect(question).toMatchObject({ name: 'notes' });
  });

  it('finds a panel by its name', () => {
    const panel = getQuestion(structure, 'infoPanel');
    expect(panel).toMatchObject({ type: 'panel', name: 'infoPanel' });
  });

  it('returns undefined when the question does not exist', () => {
    expect(getQuestion(structure, 'unknown')).toBeUndefined();
  });

  it('supports structures without pages', () => {
    const pageless = {
      elements: [{ type: 'text', name: 'a', valueName: 'a' }],
    };
    expect(getQuestion(pageless, 'a')).toMatchObject({ name: 'a' });
  });
});
