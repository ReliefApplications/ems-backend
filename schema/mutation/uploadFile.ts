import { GraphQLUpload } from "apollo-server-core";
import { GraphQLNonNull } from "graphql";
import GraphQLJSON from "graphql-type-json";
import uploadFile from "../../utils/uploadFile";

export default {
    type: GraphQLJSON,
    args: {
        file: { type: new GraphQLNonNull(GraphQLUpload) }
    },
    async resolve(parent, args, context) {
        console.log('upload');
        const file = await args.file;
        await uploadFile(file.file, context);
        return null;
    }
}