import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { PullJobType } from '../types';
import errors from '../../const/errors';
import { Application, PullJob} from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /* Delete a pullJob
    */
    type: PullJobType,
    args: {
        application: { type: new GraphQLNonNull(GraphQLID) },
        id: { type: GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const application = await Application.findById(args.application);
        if (!application) throw new GraphQLError(errors.dataNotFound);

        const filters = PullJob.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const pullJob = await PullJob.findOneAndDelete(filters);
        if (!pullJob) throw new GraphQLError(errors.permissionNotGranted);
        const update = {
            modifiedAt: new Date(),
            $pull: { pullJobs: pullJob.id },
        };
        
        await Application.findByIdAndUpdate(
            args.application,
            update,
            { new: true }
        );
        return pullJob;
    }
}