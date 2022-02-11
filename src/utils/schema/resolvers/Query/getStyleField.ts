export default (dataItem, itemsFilteredWithStyle) => {
  let itemHasStyle = false;

  const styleToApply = {
    backgroundColor: '',
    color: '',
    'font-weight': 'normal',
    'font-style': 'normal',
    'text-decoration': 'none',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
  };

  const styleFields = [];

  for (const item of itemsFilteredWithStyle) {
    if (!itemHasStyle) {
      // We loop on the filtered items to see if the dataItem is matching
      for (const data of item.data) {
        if (!itemHasStyle) {
          if (JSON.stringify(data) === JSON.stringify(dataItem)) {
            for (const field of item.style.fields) {
              styleFields.push(field.name);
            }
            Object.assign(
              styleToApply,
              item.style.backgroundColor && {
                backgroundColor: item.style.backgroundColor,
              },
              item.style.textColor && { color: item.style.textColor },
              item.style.textStyle && {
                'font-weight':
                  item.style.textStyle === 'bold' ? 'bold' : 'normal',
                'font-style':
                  item.style.textStyle === 'italic' ? 'italic' : 'normal',
                'text-decoration':
                  item.style.textStyle === 'underline' ? 'underline' : 'none',
              }
            );
            itemHasStyle = true;
          }
        }
      }
    }
  }
  const styleObj = [styleToApply, styleFields];
  return styleObj;
};
