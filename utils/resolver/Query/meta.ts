// import applyFilters from './applyFilters';

import { Form, Resource } from "../../../models";
import getFields, { getMetaFields } from "../../introspection/getFields";
import { getRelatedTypeName } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";

export default (entityName, data, id) => (
    _,
    { filter = {}
}) => {

    // let model: any = await Resource.findById(id);
    // if (!model) model = await Form.findById(id);

    console.log(data);

    const modelFields = Object.keys(getMetaFields(data[entityName]));


    const entityFields = Object.keys(getFields(data[entityName]));

    // const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
    //     (resolvers, fieldName) => {
    //         return Object.assign({}, resolvers, {
    //             [getRelatedTypeName(fieldName)]: (entity, args, context) => {
    //                 const id = entity.data[fieldName.substr(0, fieldName.length - 3)];
    //                 return id ? Record.findById(id) : null;
    //             }
    //         })
    //     },
    //     {}
    // );

    const classicResolvers = entityFields.reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return modelFields[fieldName];
                }
            }),
        {}
    );


    return Object.assign({},
        { _count: 0 },
        classicResolvers,
        // manyToOneResolvers
    );
};