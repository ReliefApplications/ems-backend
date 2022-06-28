import get from 'lodash/get';
import set from 'lodash/set';

/** Default record style */
const DEFAULT_STYLE = {
  _row: null,
};

/**
 * Gets record style.
 *
 * @param record item to check
 * @param styleRules List of items where style rules apply
 * @returns style of item
 */
const getStyle = (record, styleRules: { items: any[]; style: any }[]) => {
  const style = { ...DEFAULT_STYLE };

  for (const rule of styleRules) {
    const ruleStyle = {
      'background-color': rule.style.background?.color,
      color: rule.style.text?.color,
      'font-weight': rule.style.text?.bold && 'bold',
      'text-decoration': rule.style.text?.underline && 'underline',
      'font-style': rule.style.text?.italic && 'italic',
    };
    Object.keys(ruleStyle).forEach((key) => {
      if (!ruleStyle[key]) {
        delete ruleStyle[key];
      }
    });
    for (const item of rule.items) {
      if (item.id.equals(record.id)) {
        if (rule.style.fields?.length > 0) {
          for (const field of rule.style.fields) {
            set(style, field, {
              ...get(style, field),
              ...ruleStyle,
            });
          }
        } else {
          Object.keys(style).forEach((key) => {
            if (style[key] !== '_row') {
              delete style[key];
            }
          });
          set(style, '_row', {
            ...get(style, '_row'),
            ...ruleStyle,
          });
        }
      }
    }
  }
  return style;
};

export default getStyle;
