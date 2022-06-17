import mongoose, { Query, Schema } from 'mongoose';

/**
 * Add a callback function on a schema to be called before every deletion calls
 *
 * @param schema The mongoose schema of the model
 * @param callback The function called before deletion
 */
export const addOnBeforeDelete = <DocType>(
  schema: Schema<DocType>,
  callback: (doc: DocType) => Promise<void>
) => {
  // delete functions called on an instance of a model
  schema.pre<DocType>(
    ['deleteOne', 'remove'],
    { document: true, query: false },
    async function () {
      await callback(this);
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
          if (err) return console.error(err);
          if (!doc) return console.warn('No document found');
          await callback(doc);
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
        if (err) return console.error(err);
        if (!docs.length) return console.warn('No documents found');
        for (const doc of docs) {
          await callback(doc);
        }
      });
    }
  );
};
