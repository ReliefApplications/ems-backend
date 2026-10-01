import { Types } from 'mongoose';
import { User } from '@models';
import { getDraftRecordFilter } from '@utils/filter';
import { RecordVisibility } from '@const/enumTypes';

describe('getDraftRecordFilter', () => {
  const user = { _id: new Types.ObjectId() } as User;

  it('should exclude drafts by default', () => {
    expect(getDraftRecordFilter()).toEqual({ draft: { $ne: true } });
    expect(getDraftRecordFilter({}, user)).toEqual({ draft: { $ne: true } });
    expect(getDraftRecordFilter({ recordVisibility: 'submitted' })).toEqual({
      draft: { $ne: true },
    });
  });

  it('should only return the drafts of the current user for ownDrafts', () => {
    expect(
      getDraftRecordFilter({ recordVisibility: 'ownDrafts' }, user)
    ).toEqual({ draft: true, 'createdBy.user': user._id });
  });

  it('should return every draft for allDrafts', () => {
    expect(
      getDraftRecordFilter({ recordVisibility: 'allDrafts' }, user)
    ).toEqual({ draft: true });
  });

  it('should accept export parameters carrying a record visibility', () => {
    // Export requests send their whole body as parameters
    const exportParams = {
      format: 'xlsx',
      resource: 'resource-id',
      recordVisibility: 'allDrafts' as RecordVisibility,
    };
    expect(getDraftRecordFilter(exportParams, user)).toEqual({ draft: true });
  });
});
