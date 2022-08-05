import { Form, ReferenceData, Resource } from '../../models';
import { toGraphQLCase } from '../../utils/validators';

/** Interface definition for the structure of a schema */
export interface SchemaStructure {
  _id: string;
  name: string;
  fields: any[];
}

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
  structures.forEach((x) => (x.name = toGraphQLCase(x.name)));

  return structures;
};

/**
 * Get necessary informations from Reference Data.
 * Avoid reference data with no fields.
 *
 * @returns list of schema structures from reference data in database
 */
export const getReferenceDatas = async (): Promise<ReferenceData[]> => {
  const referenceDatas = await ReferenceData.find({
    'fields.0': { $exists: true },
  });
  return referenceDatas.map((x) => {
    x.name = x.graphQLName || toGraphQLCase(x.name);
    return x;
  });
};
