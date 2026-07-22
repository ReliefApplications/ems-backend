import { getQuestionPosition } from '@utils/form/getQuestionPosition';

describe('getQuestionPosition', () => {
  const panel = {
    type: 'panel',
    name: 'infoPanel',
    elements: [
      { type: 'text', name: 'city', valueName: 'city' },
      { type: 'text', name: 'zip', valueName: 'zip' },
    ],
  };
  const page1 = {
    name: 'page1',
    elements: [
      { type: 'text', name: 'firstName', valueName: 'first_name' },
      panel,
      { type: 'text', name: 'lastName', valueName: 'last_name' },
    ],
  };
  const structure = { pages: [page1] };

  it('returns the page and index for a top-level question', () => {
    expect(getQuestionPosition(structure, 'last_name')).toEqual({
      parent: page1,
      index: 2,
    });
  });

  it('returns the panel and index for a nested question', () => {
    expect(getQuestionPosition(structure, 'zip')).toEqual({
      parent: panel,
      index: 1,
    });
  });

  it('returns the page and index for a panel, searched by name', () => {
    expect(getQuestionPosition(structure, 'infoPanel')).toEqual({
      parent: page1,
      index: 1,
    });
  });

  it('returns undefined when the question does not exist', () => {
    expect(getQuestionPosition(structure, 'unknown')).toBeUndefined();
  });
});
