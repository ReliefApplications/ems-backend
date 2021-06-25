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
    /* Edit an existing pullJob if authorized
    */
    type: PullJobType,
    args: {
        application: { type: new GraphQLNonNull(GraphQLID) },
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        status: { type: StatusEnumType },
        apiConfiguration: { type: GraphQLID },
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

        const update = {};
        Object.assign(update,
            args.name && { name: args.name },
            args.status && { status: args.status },
            args.apiConfiguration && { apiConfiguration: args.apiConfiguration },
            args.schedule && { schedule: args.schedule },
            args.convertTo && { convertTo: args.convertTo },
            args.mapping && { mapping: args.mapping },
            args.channel && { channel: args.channel },
        );
        const filters = PullJob.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
        const pullJob = await PullJob.findOneAndUpdate(filters, update, { new: true }).populate({
            path: 'apiConfiguration',
            model: 'ApiConfiguration',
        });
        if (!pullJob) throw new GraphQLError(errors.dataNotFound);
        if (pullJob.status === status.active) {
            scheduleJob(pullJob);
        } else {
            unscheduleJob(pullJob);
        }
        return pullJob;
    }
}
