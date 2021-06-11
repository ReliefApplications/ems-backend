import { printSchema } from 'graphql';
import { camelize, singularize } from 'inflection';
import { Form, Resource } from '../models';
import getSchema from './introspection/getSchema';
import fs from 'fs';

export default async () => {
    try {
        const resources = await Resource.find({}).select('name fields') as any[];

        const forms = await Form.find({ core: { $ne: true }, status: 'active' }).select('name fields') as any[];

        const structures = resources.concat(forms);

        structures.forEach((x, index) => structures[index].name = x.name.split(' ').join('_') )

        const data = Object.fromEntries(
            structures.map(x => [camelize(singularize(x.name)), x.fields])
        );

        const typesById = Object.fromEntries(
            structures.map(x => [x._id, camelize(singularize(x.name))])
        );

        const typeDefs = printSchema(await getSchema(data, typesById));

        await new Promise((resolve, reject) => {
            fs.writeFile('src/schema.graphql', typeDefs, (err) => {
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