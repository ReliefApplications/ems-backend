import mongoose, { Query, Schema } from 'mongoose';
import { logger } from '../../services/logger.service';

/**
 * Add a callback function on a schema to be called before every deletion.
 * The callback function take several documents as input.
 *
 * This function can only be called once per schema.
 *
 * @param schema The mongoose schema of the model
 * @param callback A callback function called before deletion of several documents
 */
export const addOnBeforeDeleteMany = <DocType>(
  schema: Schema<DocType>,
  callback: (docs: DocType[]) => Promise<void>
) => {
  // delete functions called on an instance of a model
  schema.pre<DocType>(
    ['deleteOne', 'remove'],
    { document: true, query: false },
    async function () {
      await callback([this]);
    }
  );

  // delete functions called on an instance of a query
  schema.pre<Query<any, DocType>>(
    ['deleteOne', 'findOneAndDelete', 'findOneAndRemove'],
    { document: false, query: true },
    async function () {
      await this.findOne(
        null,
        async (err: mongoose.NativeError, doc: DocType) => {
          if (err) return logger.error(err.message, { stack: err.stack });
          if (!doc) return logger.error('No document found');
          await callback([doc]);
        }
      );
    }
  );

  // delete functions called on an instance of a query with multiple instances
  // of the model
  schema.pre<Query<any, DocType>>(
    ['deleteMany'],
    { document: false, query: true },
    async function () {
      await this.find(async (err: mongoose.NativeError, docs: DocType[]) => {
        if (err) return logger.error(err.message, { stack: err.stack });
        if (!docs.length) return logger.error('No documents found');
        await callback(docs);
      });
    }
  );
};

/**
 * Add a callback function on a schema to be called before every deletion.
 * The callback function take only one document as input.
 *
 * When possible, prefer to use `addOnBeforeDeleteMany` which is more efficient
 * if you plan to delete many documents at once. DO NOT use both
 * `addOnBeforeDeleteMany` and `addOnBeforeDeleteOne`.
 *
 * @param schema The mongoose schema of the model
 * @param callback A callback function called before deletion of one document
 */
export const addOnBeforeDeleteOne = <DocType>(
  schema: Schema<DocType>,
  callback: (doc: DocType) => Promise<void>
) => {
  addOnBeforeDeleteMany(schema, async (docs: DocType[]) => {
    for (const doc of docs) await callback(doc);
  });
};
