import { Page, PageContextT } from '@models';
import { get, isNil } from 'lodash';
import { Types } from 'mongoose';

/**
 * Check if context is duplicated in the page, to avoid creating multiple similar templates.
 *
 * @param context page context
 * @param contentWithContext list of contextual templates
 * @param entry new entry
 * @param entry.element new element ( if ref data )
 * @param entry.record new record ( if resource )
 * @returns is entry duplicated or not
 */
export const hasDuplicate = (
  context: PageContextT,
  contentWithContext: Page['contentWithContext'],
  entry: {
    element?: any;
    record?: string | Types.ObjectId;
  }
) => {
  const uniqueEntries = new Set();
  if (!isNil(get(context, 'resource'))) {
    for (const item of contentWithContext) {
      if (get(item, 'record')) {
        uniqueEntries.add((item as any).record.toString());
      }
    }
    if (uniqueEntries.has(entry.record.toString())) {
      return true;
    }
  } else {
    for (const item of contentWithContext) {
      if (get(item, 'element')) {
        uniqueEntries.add((item as any).element.toString());
      }
    }
    if (uniqueEntries.has(entry.element.toString())) {
      return true;
    }
  }
  return false;
};
