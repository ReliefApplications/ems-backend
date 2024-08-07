import { Form, ReferenceData, Resource } from '@models';
import { Types } from 'mongoose';

/** Interface definition for the structure of a schema */
export interface SchemaStructure {
  _id: Types.ObjectId;
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
  structures.forEach((x) => (x.name = Form.getGraphQLTypeName(x.name)));

  return structures;
};

/**
 * Get necessary information from Reference Data.
 * Avoid reference data with no fields.
 *
 * @returns list of schema structures from reference data in database
 */
export const getReferenceDatas = async (): Promise<ReferenceData[]> => {
  const referenceDatas = await ReferenceData.find({
    'fields.0': { $exists: true },
  }).populate({
    path: 'apiConfiguration',
    model: 'ApiConfiguration',
    select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
  });
  return referenceDatas.map((x) => {
    x.name = ReferenceData.getGraphQLTypeName(x.name);
    return x;
  });
};
