import mongoose, { Model } from 'mongoose';
import { Record, User } from '../models';

function convertFilter(query, model: Model<Record>, user: User) {

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
            switch (value) {
                case '$$own': {
                    return user.id;
                }
                case '$$own.positionAttributes.value': {
                    return user.positionAttributes.map(x => x.value);
                }
                default: {
                    return null;
                }
            }
        } else {
            return value;
        }
    }

    // Map each rule to a MongoDB query
    const mapRule = (rule) => {

        const field = rule.field;
        let value = rule.value

        if (!value) {
            value = null;
        }

        // Get schema type of current field
        // const schemaType = model.schema.path(field) ? model.schema.path(field).instance : false;
        const schemaType =  model.schema.path(field)['instance'];
        console.log(rule.field);
        console.log(schemaType);
        // Check if schema type of current field is ObjectId
        if (schemaType === 'ObjectID' && value) {
            // Convert string value to MongoDB ObjectId
            if (Array.isArray(value)) {
                value.map(val => mongoose.Types.ObjectId(convertVariable(val)));
            } else {
                value = mongoose.Types.ObjectId(convertVariable(value));
            }
            // Check if schema type of current field is Date
        } else if (schemaType === 'Date' && value) {
            // Convert string value to ISO date
            value = new Date(value);
        } else {
            value = convertVariable(value);
        }

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