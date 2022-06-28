import { Form, ReferenceData, Resource } from '../../models';
import { pascalCase } from 'pascal-case';

/** Interface definition for the structure of a schema */
export interface SchemaStructure {
  _id: string;
  name: string;
  fields: any[];
}

/**
 * Transform a string into a GraphQL type name
 *
 * @param name name of form / resource in database
 * @returns name of new GraphQL type
 */
const getGraphQLTypeName = (name: string) => {
  return pascalCase(name);
};

/**
 * Get id / name and fields of forms / resources in database
 *
 * @returns list of schema structures from forms / resources in database
 */
export const getStructures = async (): Promise<SchemaStructure[]> => {
  // Get all resources
  const resources = (await Resource.find({}).select(
    'name fields'
  )) as SchemaStructure[];

  // Get all active forms
  const forms = (await Form.find({
    core: { $ne: true },
    status: 'active',
  }).select('name fields')) as SchemaStructure[];

  // Get all resources and clear names
  const structures = resources.concat(forms);
  structures.forEach((x) => (x.name = getGraphQLTypeName(x.name)));

  return structures;
};

/**
 * Get necessary informations from Reference Data
 *
 * @returns list of schema structures from reference data in database
 */
export const getReferenceDatas = async (): Promise<ReferenceData[]> => {
  const referenceDatas = await ReferenceData.find({});
  return referenceDatas.map((x) => {
    x.name = getGraphQLTypeName(x.name);
    return x;
  });
};
