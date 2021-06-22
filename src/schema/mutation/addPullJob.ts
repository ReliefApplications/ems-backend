import { GraphQLError, GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import mongoose from 'mongoose';
import { PullJobType } from '../types';
import errors from '../../const/errors';
import { status } from '../../const/enumTypes';
import { Application, Channel, Form, PullJob} from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { StatusEnumType } from '../../const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';

export default {
    /* Creates a new pullJob
    */
    type: PullJobType,
    args: {
        application: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(StatusEnumType) },
        apiConfiguration: { type: new GraphQLNonNull(GraphQLID) },
        schedule : { type: GraphQLString },
        convertTo: { type: GraphQLID },
        mapping: { type: GraphQLJSON },
        channel: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        const application = await Application.findById(args.application);
        if (!application) throw new GraphQLError(errors.dataNotFound);

        if (args.convertTo) {
            const form = await Form.findById(args.convertTo);
            if (!form) throw new GraphQLError(errors.dataNotFound);
        }

        if (args.channel) {
            const filters = {
                application: mongoose.Types.ObjectId(args.application),
                _id: args.channel
            };
            const channel = await Channel.findOne(filters);
            if (!channel) throw new GraphQLError(errors.dataNotFound);
        }

        // Create a new PullJob
        const pullJob = new PullJob({
            name: args.name,
            status: args.status,
            apiConfiguration: args.apiConfiguration,
            schedule: args.schedule,
            convertTo: args.convertTo,
            mapping: args.mapping,
            channel: args.channel
        });
        await pullJob.save();

        // Link the new pullJob to the corresponding application by updating this application.
        const update = {
            modifiedAt: new Date(),
            $push: { pullJobs: pullJob.id },
        };
        const filters = Application.accessibleBy(ability, 'update').where({_id: args.application}).getFilter();
        await Application.findOneAndUpdate(
            filters,
            update
        );
        if (args.status === status.active) {
            const fullPullJob = await PullJob.findById(pullJob.id).populate({
                path: 'apiConfiguration',
                model: 'ApiConfiguration',
            });
            scheduleJob(fullPullJob);
        } else {
            unscheduleJob(pullJob);
        }
        return pullJob;
    }
}
