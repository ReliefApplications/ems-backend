import { printSchema } from 'graphql';
import { getSchema } from './introspection/getSchema';
import fs from 'fs';
import { getStructures } from './getStructures';

const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Build GraphQL types from the active resources / forms stored in the database.
 * @returns void. Ends when the types are written in the file, or if error occurs.
 */
export const buildTypes = async (): Promise<void> => {
    try {
        const structures = await getStructures();

        const fieldsByName: any = structures.reduce((obj, x) => {
            obj[x.name] = x.fields;
            return obj;
        }, {});

        const namesById: any = structures.reduce((obj, x) => {
            obj[x._id] = x.name;
            return obj;
        }, {});

        const typeDefs = printSchema(getSchema(fieldsByName, namesById));

        await new Promise((resolve, reject) => {
            fs.writeFile(GRAPHQL_SCHEMA_FILE, typeDefs, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    console.log('🔨 Types generated.')
                    resolve(null);
                }
            });
        });

        return;

    } catch (err) {
        console.error(err);
        return;
    }
}
