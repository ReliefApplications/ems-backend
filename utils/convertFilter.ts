import { GraphQLError } from 'graphql';
import mongoose, { Model } from 'mongoose';
import { Record, User } from '../models';

function convertFilter(query: any, model: Model<Record>, user: User) {

    if (!query || !model) {
        return {};
    }

    const conditions = { "and": "$and", "or": "$or" };
    const operators = {
        "=": "$eq",
        "!=": "$ne",
        "<": "$lt",
        "<=": "$lte",
        ">": "$gt",
        ">=": "gte",
        "in": "$in",
        "not in": "$nin",
        "contains": "$regex",
        "match": "$elemMatch"
    };

    const convertVariable = (value: string) => {
        if (value.startsWith('$$')) {
            const fields = value.split('.');
            const identifier = fields.shift();
            let output;
            // Check the identifier to fetch corresponding data
            switch (identifier) {
                case '$$own': {
                    output = user;
                    break;
                }
                default: {
                    break;
                }
            }
            // Loop on fields to access embedded data
            for (const field of fields) {
                if (Array.isArray(output)) {
                    if (field.startsWith('$$')) {
                        const variables = field.split(':');
                        const functionIdentifier = variables.shift();
                        // Check identifier to apply a specific function to the output
                        switch (functionIdentifier) {
                            case '$$where': {
                                output = output.filter(x => x[variables[0]].equals(variables[1]));
                                if (output.length === 1) {
                                    output = output.pop();
                                }
                            }
                        }
                    } else {
                        output = output.flatMap(x => x[field]);
                    }
                } else {
                    output = output[field];
                }
            }
            return output;
        } else {
            return value;
        }
    }

    function convertToType(schemaType: any, value: any, field: string) {
        // Throw an error if we couldn't get the type of the field
        if (!schemaType) throw new GraphQLError('Cannot find the type of field ' + field + ' in model ' + model.modelName);

        // Check if schema type of current field is an Array so we can retrieve the embedded type
        if (schemaType === 'Array') {
            schemaType = model.schema.path(field + '.$') ? model.schema.path(field + '.$')['instance'] : 'Object';
        }

        // Check if schema type of current field is ObjectId
        if (schemaType === 'ObjectID' && value) {
            // Convert string value to MongoDB ObjectId
            if (Array.isArray(value)) {
                return value.map(val => mongoose.Types.ObjectId(convertVariable(val)));
            } else {
                value = convertVariable(value);
                if (Array.isArray(value)) {
                    return value.map(val => mongoose.Types.ObjectId(val._id ? val._id : val));
                } else {
                    return mongoose.Types.ObjectId(value._id ? value._id : value);
                }
            }
            // Check if schema type of current field is Date
        } else if (schemaType === 'Date' && value) {
            // Convert string value to ISO date
            return new Date(convertVariable(value));
            // Check if schema type of current field is Object
        } else if (schemaType === 'Object' && value) {
            const query = JSON.parse(value);
            for (const key in query) {
                // Get type for each key of the object
                const keyType = model.schema.path(field)['schema'].path(key) ? model.schema.path(field)['schema'].path(key)['instance'] : false;
                query[key] = convertToType(keyType, query[key], field + key);
                // Add an $in operator if the query is an array on a field which is not an array
                if (Array.isArray(query[key]) && keyType !== 'Array') {
                    query[key] = { '$in' : query[key] };
                }
            }
            return query;
        } else {
            return convertVariable(value);
        }
    }

    // Map each rule to a MongoDB query
    const mapRule = (rule) => {

        const field: string = rule.field;
        let value = rule.value

        if (!value) {
            value = null;
        }

        // Get schema type of current field
        // tslint:disable-next-line: no-string-literal
        const schemaType =  model.schema.path(field) ? model.schema.path(field)['instance'] : false;

        // Convert value to retrieve variables and to attribute right types
        value = convertToType(schemaType, value, field);

        // Set operator
        const operator = operators[rule.operator] ? operators[rule.operator] : '$eq';

        // Create a MongoDB query
        let mongoDBQuery;

        // Check if operator is $regex
        if (operator === '$regex') {
            // Set case insensitive option
            mongoDBQuery = {
                [field]: {
                    [operator]: value,
                    '$options': 'i'
                }
            };
        } else {
            mongoDBQuery = { [field]: { [operator]: value } };
        }

        return mongoDBQuery;

    }

    const mapRuleSet = (ruleSet) => {

        if (ruleSet.rules.length < 1) {
            return;
        }

        // Iterate Rule Set conditions recursively to build database query
        return {
            [conditions[ruleSet.condition]]: ruleSet.rules.map(
                rule => rule.operator ? mapRule(rule) : mapRuleSet(rule)
            )
        }
    };

    const mongoDbQuery = mapRuleSet(query);

    return mongoDbQuery;

}

export default convertFilter;