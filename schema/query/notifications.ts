import { GraphQLList } from "graphql";
import { NotificationType } from "../types";

export default {
    type: new GraphQLList(NotificationType),
    resolve(parent, args, context) {
        return [];
    }
}