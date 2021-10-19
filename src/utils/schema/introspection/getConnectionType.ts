import { Connection } from '../../../schema/types';

export const getGraphQLConnectionTypeName = (name: string) => {
    return name + 'Connection';
};

const getConnectionTypes = (types: any[]) => {
    return types.map(x => {
        return Connection(x)
    });
};

export default getConnectionTypes;
