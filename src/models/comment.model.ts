import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose distribution list schema declaration */
export const CommentSchema = new Schema(
  {
    name: String,
    message: String,
    record: mongoose.Types.ObjectId,
    questionId: String,
    createdBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      roles: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Role',
      },
      positionAttributes: [
        {
          value: String,
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PositionAttributeCategory',
          },
        },
      ],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** Comment interface for query */
export interface Comment extends Document {
  kind: 'Comment';
  message?: string;
  record?: mongoose.Types.ObjectId;
  questionId?: string;
  createdBy?: any;
}

/** Mongoose comment model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Comment = mongoose.model<Comment, AccessibleRecordModel<Comment>>(
  'Comment',
  CommentSchema
);
