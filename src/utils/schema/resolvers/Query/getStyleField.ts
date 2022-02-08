export default (dataItem, itemsFilteredWithStyle) => {
  let itemHasStyle = false;
  const styleToApply = {
    backgroundColor: '',
    textColor: '',
    textStyle: '',
    styleAppliedTo: '',
    fields: [],
  };

  for (const item of itemsFilteredWithStyle) {
    if (!itemHasStyle) {
      // We loop on the filtered items to see if the dataItem is matching
      for (const data of item.data) {
        if (!itemHasStyle) {
          if (JSON.stringify(data) === JSON.stringify(dataItem)) {
            Object.assign(
              styleToApply,
              item.style.backgroundColor && {
                backgroundColor: item.style.backgroundColor,
              },
              item.style.textColor && { textColor: item.style.textColor },
              item.style.textStyle && { textStyle: item.style.textStyle },
              item.style.styleAppliedTo && {
                styleAppliedTo: item.style.styleAppliedTo,
              },
              item.style.fields && { fields: item.style.fields }
            );
            itemHasStyle = true;
          }
        }
      }
    }
  }
  return styleToApply;
};
