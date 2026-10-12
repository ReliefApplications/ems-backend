import { FilterQuery } from 'mongoose';
import { Record, User } from '@models';
import { recordVisibility, RecordVisibility } from '@const/enumTypes';

/** Arguments accepted by record queries that can include drafts. */
export type DraftRecordFilterArgs = {
  recordVisibility?: RecordVisibility;
};

/**
 * Builds the draft portion of a record query.
 * Standard record paths exclude drafts. Draft paths show the current user's
 * drafts, or every draft when the caller explicitly asks for all of them.
 *
 * @param args Query arguments controlling draft visibility.
 * @param user Current user.
 * @returns Mongo filter for draft visibility.
 */
export const getDraftRecordFilter = (
  args: DraftRecordFilterArgs = {},
  user?: User
): FilterQuery<Record> => {
  switch (args.recordVisibility) {
    case recordVisibility.allDrafts: {
      return { draft: true };
    }
    case recordVisibility.ownDrafts: {
      return {
        draft: true,
        ...(user?._id && { 'createdBy.user': user._id }),
      };
    }
    default: {
      return { draft: { $ne: true } };
    }
  }
};
