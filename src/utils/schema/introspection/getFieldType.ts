import { inputType, questionType } from '@services/form.service';
import { MULTISELECT_TYPES } from '@const/fieldTypes';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLList,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
} from 'graphql';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-scalars';
import GraphQLJSON from 'graphql-type-json';

/** Interface definition for a Form field */
export interface Field {
  type: string;
  resource?: string;
  referenceData?: {
    id: string;
    displayField: string;
  };
  name?: string;
}

/**
 * Get GraphQL type from field definition.
 *
 * @param field field definition.
 * @param filter true if the type is for a filter type.
 * @returns GraphQL type.
 */
const getFieldType = (
  field: Field,
  filter = false
):
  | GraphQLScalarType
  | GraphQLScalarType
  | GraphQLList<GraphQLType>
  | GraphQLScalarType[] => {
  if (field.resource && field.type === 'text') {
    return GraphQLID;
  }
  if (field.referenceData) {
    if (MULTISELECT_TYPES.includes(field.type)) {
      return new GraphQLList(GraphQLID);
    }
    return GraphQLID;
  }
  switch (field.type) {
    case questionType.RESOURCE: {
      return GraphQLID;
    }
    case questionType.RESOURCES: {
      return filter ? new GraphQLList(GraphQLID) : [GraphQLID];
    }
    case questionType.TEXT: {
      return GraphQLString;
    }
    case inputType.URL: {
      return GraphQLString;
    }
    case inputType.EMAIL: {
      return GraphQLString;
    }
    case inputType.TEL: {
      return GraphQLString;
    }
    case questionType.DROPDOWN: {
      return GraphQLString;
    }
    case questionType.RADIO_GROUP: {
      return GraphQLString;
    }
    case questionType.COMMENT: {
      return GraphQLString;
    }
    case questionType.BOOLEAN: {
      return GraphQLBoolean;
    }
    case inputType.NUMERIC: {
      return GraphQLFloat;
    }
    case inputType.DECIMAL: {
      return GraphQLFloat;
    }
    case inputType.DATE: {
      return GraphQLDate;
    }
    case inputType.DATETIME: {
      return GraphQLDateTime;
    }
    case inputType.DATETIME_LOCAL: {
      return GraphQLDateTime;
    }
    case inputType.TIME: {
      return GraphQLTime;
    }
    case questionType.MULTIPLE_TEXT: {
      return GraphQLJSON;
    }
    case questionType.MATRIX: {
      return GraphQLJSON;
    }
    case questionType.MATRIX_DROPDOWN: {
      return GraphQLJSON;
    }
    case questionType.MATRIX_DYNAMIC: {
      return GraphQLJSON;
    }
    case questionType.CHECKBOX: {
      return GraphQLJSON;
    }
    case questionType.FILE: {
      return GraphQLJSON;
    }
    case questionType.TAGBOX: {
      return GraphQLJSON;
    }
    case questionType.USERS: {
      return GraphQLJSON;
    }
    case questionType.OWNER: {
      return GraphQLJSON;
    }
    case questionType.GEOSPATIAL: {
      return GraphQLJSON;
    }
    case questionType.EDITOR: {
      return GraphQLString;
    }
    default: {
      return GraphQLString;
    }
  }
};

export default getFieldType;
