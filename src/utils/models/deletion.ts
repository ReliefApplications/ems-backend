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
      // console.log((this as any).op, 'doc');
      await callback(this);
    }
  );

  // delete functions called on an instance of a query
  schema.pre<Query<any, DocType>>(
    ['deleteOne', 'findOneAndDelete', 'findOneAndRemove'],
    { document: false, query: true },
    async function () {
      // console.log((this as any).op, 'query');
      this.findOne(null, async (err: mongoose.NativeError, step: DocType) => {
        if (!err) await callback(step);
      });
    }
  );

  // delete functions called on an instance of a query with multiple instances
  // of the model
  schema.pre<Query<any, DocType>>(
    ['deleteMany'],
    { document: false, query: true },
    async function () {
      // console.log((this as any).op);
      this.find(async (err: mongoose.NativeError, steps: DocType[]) => {
        if (!err) {
          for (const step of steps) {
            await callback(step);
          }
        }
      });
    }
  );
};
