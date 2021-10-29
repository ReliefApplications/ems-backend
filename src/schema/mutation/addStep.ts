import { GraphQLString, GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { contentType } from '../../const/enumTypes';
import errors from '../../const/errors';
import { Workflow, Dashboard, Step, Page, Application, Role, Form } from '../../models';
import { StepType } from '../types';
import mongoose from 'mongoose';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /*  Creates a new step linked to an existing workflow.
        Creates also the associated Dashboard if it's the step's type.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: StepType,
  args: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLID },
    workflow: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    if (!args.workflow || !(args.type in contentType)) {
      throw new GraphQLError(errors.invalidAddStepArguments);
    }
    const page = await Page.findOne({ content: args.workflow });
    if (!page) { throw new GraphQLError(errors.dataNotFound); }
    const application = await Application.findOne({ pages: { $elemMatch: { $eq: mongoose.Types.ObjectId(page._id) } } });
    let stepName = '';
    if (ability.can('update', application)) {
      const workflow = await Workflow.findById(args.workflow);
      if (!workflow) throw new GraphQLError(errors.dataNotFound);
      // Create a linked Dashboard if necessary
      if (args.type === contentType.dashboard) {
        stepName = 'Dashboard';
        const dashboard = new Dashboard({
          name: stepName,
          createdAt: new Date(),
        });
        await dashboard.save();
        args.content = dashboard._id;
      } else {
        const form = await Form.findById(args.content);
        if (!form) {
          throw new GraphQLError(errors.dataNotFound);
        }
        stepName = form.name;
      }
      // Create a new step.
      const roles = await Role.find({ application: application._id });
      const step = new Step({
        name: stepName,
        createdAt: new Date(),
        type: args.type,
        content: args.content,
        permissions: {
          canSee: roles.map(x => x.id),
          canUpdate: [],
          canDelete: [],
        },
      });
      await step.save();
      // Link the new step to the corresponding application by updating this application.
      const update = {
        modifiedAt: new Date(),
        $push: { steps: step.id },
      };
      await Workflow.findByIdAndUpdate(
        args.workflow,
        update,
      );
      return step;
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
