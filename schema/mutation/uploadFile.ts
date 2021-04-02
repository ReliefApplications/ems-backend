import { GraphQLUpload } from "apollo-server-core";
import { GraphQLBoolean, GraphQLNonNull } from "graphql";
import uploadFile from "../../utils/uploadFile";

export default {
    type: GraphQLBoolean,
    args: {
        file: { type: new GraphQLNonNull(GraphQLUpload) }
    },
    async resolve(parent, args, context) {
        const file = await args.file;
        await uploadFile(file.file, context);
        return true;
    }
}