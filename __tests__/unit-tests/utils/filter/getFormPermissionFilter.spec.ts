import mongoose from 'mongoose';
import { getFormPermissionFilter } from '@utils/filter/getFormPermissionFilter';
import { resourcePermission } from '../../../../src/types/permission';

describe('getFormPermissionFilter', () => {
  const roleId = new mongoose.Types.ObjectId();

  const user = {
    roles: [{ _id: roleId }],
    attributes: {
      region: 'North',
      locationType: 'Regional Office',
    },
  } as any;

  const resource = {
    id: 'resource-1',
    fields: [
      { name: 'region', type: 'text' },
      { name: 'country', type: 'text' },
    ],
    permissions: {
      [resourcePermission.UPDATE_RECORDS]: [],
    },
  } as any;

  it('maps attribute-to-field comparisons to record filters using the current user', () => {
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      {
        role: roleId,
        access: {
          logic: 'and',
          filters: [
            {
              field: '$attribute.region',
              operator: 'eq',
              value: 'region',
            },
          ],
        },
      },
    ];

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([
      {
        $and: [{ 'data.region': 'North' }],
      },
    ]);
  });

  it('supports literal equality checks on attributes when valueSource is set', () => {
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      {
        role: roleId,
        access: {
          logic: 'and',
          filters: [
            {
              field: '$attribute.locationType',
              operator: 'eq',
              value: 'Regional Office',
              valueSource: 'literal',
            },
            {
              field: 'country',
              operator: 'eq',
              value: 'Tunisia',
            },
          ],
        },
      },
    ];

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

  it('uses text input operators on attributes without an explicit value source', () => {
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      {
        role: roleId,
        access: {
          logic: 'and',
          filters: [
            {
              field: '$attribute.locationType',
              operator: 'contains',
              value: 'Regional',
            },
            {
              field: 'country',
              operator: 'eq',
              value: 'France',
            },
          ],
        },
      },
    ];

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
    resource.permissions[resourcePermission.UPDATE_RECORDS] = [
      {
        role: roleId,
        access: {
          logic: 'and',
          filters: [
            {
              field: '$attribute.locationType',
              operator: 'contains',
              value: 'Head Office',
            },
          ],
        },
      },
    ];

    const filters = getFormPermissionFilter(
      user,
      resource,
      resourcePermission.UPDATE_RECORDS
    );

    expect(filters).toEqual([
      {
        $and: [{ _id: { $exists: false } }],
      },
    ]);
  });
});
