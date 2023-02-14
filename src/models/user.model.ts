import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttribute } from './positionAttribute.model';
import { MongoDataSource } from 'apollo-datasource-mongodb';

/** Mongoose user schema definition */
const userSchema = new Schema(
  {
    username: String,
    firstName: String,
    lastName: String,
    name: String,
    oid: String,
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    positionAttributes: {
      type: [PositionAttribute.schema],
    },
    favoriteApp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
    },
    deleteAt: { type: Date, expires: 0 }, // Date of when we must remove the user
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** User documents interface definition */
export interface User extends Document {
  kind: 'User';
  firstName?: string;
  lastName?: string;
  username?: string;
  name?: string;
  oid?: string;
  roles?: any[];
  groups?: any[];
  positionAttributes?: PositionAttribute[];
  ability?: AppAbility;
  favoriteApp?: any;
  attributes?: any;
  modifiedAt?: Date;
  deleteAt?: Date;
}

userSchema.index(
  { oid: 1 },
  { unique: true, partialFilterExpression: { oid: { $type: 'string' } } }
);
userSchema.index({ username: 1 }, { unique: true });
userSchema.plugin(accessibleRecordsPlugin);

/** Mongoose user model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const User = mongoose.model<User, AccessibleRecordModel<User>>(
  'User',
  userSchema
);

/**
 * User data source for speed optimize.
 */
export class UserDataSource extends MongoDataSource<User> {
  /**
   * Get all users
   *
   * @returns Form data.
   */
  async getUsers() {
    return this.model.find();
  }

  /**
   * Get user detail by id
   *
   * @param id is user id
   * @returns Single User data.
   */
  async getUser(id) {
    return this.findOneById(id);
  }
}
