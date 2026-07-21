import { Record, User } from '@models';
import { FilterQuery } from 'mongoose';

/** Arguments accepted by record queries that can include drafts. */
export type DraftRecordFilterArgs = {
  draft?: boolean;
  allDrafts?: boolean;
};

/**
 * Builds the draft portion of a record query.
 * Standard record paths exclude drafts; draft paths show current user's drafts
 * unless the caller explicitly asks for all drafts.
 *
 * @param args Query arguments controlling draft visibility.
 * @param user Current user.
 * @returns Mongo filter for draft visibility.
 */
export const getDraftRecordFilter = (
  args: DraftRecordFilterArgs = {},
  user?: User
): FilterQuery<Record> => {
  if (args.draft) {
    const filter: FilterQuery<Record> = { draft: true };
    if (!args.allDrafts && user?._id) {
      Object.assign(filter, { 'createdBy.user': user._id });
    }
    return filter;
  }

  return { draft: { $ne: true } };
};
