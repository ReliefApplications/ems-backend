import mongoose from 'mongoose';
import { getFormPermissionFilter } from '@utils/filter/getFormPermissionFilter';
import { resourcePermission } from '../../../../src/types/permission';

describe('getFormPermissionFilter', () => {
  const roleId = new mongoose.Types.ObjectId();

  const user = {
    roles: [{ _id: roleId }],
    oid: 'aad-object-id',
    username: 'John.Doe@who.int',
    attributes: {
      region: 'North',
      location: 'Regional Office',
      'country.iso3code': 'TUN',
    },
  } as any;

  const resource = {
    id: 'resource-1',
    fields: [
      { name: 'region', type: 'text' },
      { name: 'country', type: 'text' },
      { name: 'im_team', type: 'people-tagbox' },
    ],
    permissions: {
      [resourcePermission.UPDATE_RECORDS]: [],
    },
  } as any;

  /**
   * Sets the canUpdateRecords access filter of the tested resource for the
   * user's role.
   *
   * @param access access filter to set
   */
  const setAccess = (access: any) => {
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      { role: roleId, access },
    ];
  };

  it('maps attribute-to-field comparisons to record filters using the current user', () => {
    setAccess({
      logic: 'and',
      filters: [{ field: '$attribute.region', operator: 'eq', value: 'region' }],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([{ $and: [{ 'data.region': 'North' }] }]);
  });

  it('supports enriched dot-notation attribute keys', () => {
    setAccess({
      logic: 'and',
      filters: [
        {
          field: '$attribute.country.iso3code',
          operator: 'eq',
          value: 'country',
        },
      ],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([{ $and: [{ 'data.country': 'TUN' }] }]);
  });

  it('supports literal equality checks on attributes when valueSource is set', () => {
    setAccess({
      logic: 'and',
      filters: [
        {
          field: '$attribute.location',
          operator: 'eq',
          value: 'Regional Office',
          valueSource: 'literal',
        },
        { field: 'country', operator: 'eq', value: 'Tunisia' },
      ],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([
      {
        $and: [
          { _id: { $exists: true } },
          { 'data.country': { $eq: 'Tunisia' } },
        ],
      },
    ]);
  });

  it('uses literal comparisons on attributes for non-field operators', () => {
    setAccess({
      logic: 'and',
      filters: [
        { field: '$attribute.location', operator: 'contains', value: 'Regional' },
        { field: 'country', operator: 'eq', value: 'France' },
      ],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([
      {
        $and: [
          { _id: { $exists: true } },
          { 'data.country': { $eq: 'France' } },
        ],
      },
    ]);
  });

  it('turns unmatched literal attribute checks into an impossible filter', () => {
    setAccess({
      logic: 'and',
      filters: [
        {
          field: '$attribute.location',
          operator: 'notin',
          value: 'HQ, Regional Office',
          valueSource: 'literal',
        },
      ],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([{ $and: [{ _id: { $exists: false } }] }]);
  });

  it('matches the connected user inside people fields with the me value', () => {
    setAccess({
      logic: 'and',
      filters: [{ field: 'im_team', operator: 'eq', value: 'me' }],
    });

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([
      {
        $and: [
          {
            $or: [
              { 'data.im_team.userid': 'aad-object-id' },
              {
                'data.im_team.emailaddress': {
                  $regex: '^John\\.Doe@who\\.int$',
                  $options: 'i',
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it('returns no filter for roles the user does not have', () => {
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      {
        role: new mongoose.Types.ObjectId(),
        access: {
          logic: 'and',
          filters: [{ field: 'country', operator: 'eq', value: 'France' }],
        },
      },
    ];

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([]);
  });
});
