import { GraphQLBoolean, GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import buildPipeline from '../../utils/aggregation/buildPipeline';
import mongoose from 'mongoose';

export default {
  /* Take an aggregation configuration as parameter.
        Returns aggregated records data.
    */
  type: GraphQLJSON,
  args: {
    aggregation: { type: new GraphQLNonNull(GraphQLJSON) },
    withMapping: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    const ability: AppAbility = context.user.ability;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const pipeline: any[] = [];
    const globalFilters: any[] = [
      {
        archived: { $ne: true },
      },
    ];
    // Check against records permissions if needed
    if (!ability.can('read', 'Record')) {
      const allFormPermissionsFilters = [];
      const forms = await Form.find({}).select('_id permissions');
      for (const form of forms) {
        if (form.permissions.canSeeRecords.length > 0) {
          const permissionFilters = getFormPermissionFilter(
            user,
            form,
            'canSeeRecords'
          );
          if (permissionFilters.length > 0) {
            allFormPermissionsFilters.push({
              $and: [{ form: form._id }, { $or: permissionFilters }],
            });
          }
        } else {
          allFormPermissionsFilters.push({ form: form._id });
        }
      }
      globalFilters.push({ $or: allFormPermissionsFilters });
    }
    // Build data source step
    const form = await Form.findById(
      args.aggregation.dataSource,
      'core fields resource'
    );
    if (args.aggregation.dataSource) {
      if (form.core) {
        globalFilters.push({
          resource: mongoose.Types.ObjectId(form.resource),
        });
      } else {
        globalFilters.push({
          form: mongoose.Types.ObjectId(args.aggregation.dataSource),
        });
      }
      pipeline.push({
        $match: {
          $and: globalFilters,
        },
      });
    } else {
      throw new GraphQLError(errors.invalidAggregation);
    }
    // Build the source fields step
    if (args.aggregation.sourceFields && args.aggregation.sourceFields.length) {
      pipeline.push({
        $project: {
          ...(args.aggregation.sourceFields as any[]).reduce(
            (o, field) =>
              Object.assign(o, {
                [field]: `$data.${field}`,
              }),
            {}
          ),
        },
      });
    } else {
      throw new GraphQLError(errors.invalidAggregation);
    }
    // Build pipeline stages
    if (args.aggregation.pipeline && args.aggregation.pipeline.length) {
      buildPipeline(pipeline, args.aggregation.pipeline, form, context);
    }
    // Build mapping step
    if (args.withMapping) {
      if (args.aggregation.mapping) {
        pipeline.push({
          $project: {
            category: `$${args.aggregation.mapping.xAxis}`,
            field: `$${args.aggregation.mapping.yAxis}`,
          },
        });
      }
    } else {
      pipeline.push({
        $limit: 10,
      });
    }
    return Record.aggregate(pipeline);
  },
};
