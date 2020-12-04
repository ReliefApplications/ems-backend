import { GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { WorkflowType } from "../types";
import Workflow from '../../models/workflow';

export default {
    /*  List all workflows available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(WorkflowType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Workflow.find({});
        } else {
            return new GraphQLError(errors.permissionNotGranted);
        }
    }
}