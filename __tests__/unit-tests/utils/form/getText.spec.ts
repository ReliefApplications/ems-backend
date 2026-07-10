import { getText } from '@utils/form/getDisplayText';

describe('getText', () => {
  const choices = [
    { value: 'New', text: { default: 'New request received', ua: 'Нова заявка отримана' } },
    { value: 'Closed', text: { default: 'Closed', ua: 'Завершено' } },
  ];

  it('returns the localized text for the requested locale', () => {
    expect(getText(choices, 'New', 'uk')).toBe('Нова заявка отримана');
    expect(getText(choices, 'Closed', 'uk')).toBe('Завершено');
  });

  it('falls back to the default text when no locale is given', () => {
    expect(getText(choices, 'New')).toBe('New request received');
  });

  it('falls back to the default text when the locale is not translated', () => {
    expect(getText(choices, 'New', 'fr')).toBe('New request received');
  });

  it('supports plain string choice texts', () => {
    const stringChoices = [{ value: 'a', text: 'Plain A' }];
    expect(getText(stringChoices, 'a', 'uk')).toBe('Plain A');
  });

  it('returns the raw value when no choice matches', () => {
    expect(getText(choices, 'Unknown', 'uk')).toBe('Unknown');
  });

  it('returns the choice itself when it has no text property', () => {
    expect(getText(['a', 'b'], 'a', 'uk')).toBe('a');
  });

  it('returns the value untouched when it is falsy', () => {
    expect(getText(choices, '', 'uk')).toBe('');
    expect(getText(choices, undefined, 'uk')).toBeUndefined();
  });
});
