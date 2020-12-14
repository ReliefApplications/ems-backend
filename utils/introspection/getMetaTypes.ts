import { GraphQLInt, GraphQLObjectType } from "graphql"
import { getMetaFields } from "./getFields"
import { getTypeFromKey } from "./getTypeFromKey"

export default (data) => {
    return Object.keys(data).reduce(
        (types, key) => {
            return Object.assign({}, types, {
                [getTypeFromKey(key)]: new GraphQLObjectType({
                    name: `${getTypeFromKey(key)}MetaData`,
                    fields: Object.assign(
                        {
                            _count: { type: GraphQLInt }
                        },
                        getMetaFields(data[key]),
                    )
                })
            })
        },
        {}
    )
}