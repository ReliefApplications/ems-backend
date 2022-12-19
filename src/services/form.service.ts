// This is needed for compilation of surveyjs-widgets with strict option enabled.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../typings/surveyjs-widgets/index.d.ts" />
(global as any).self = global;

import * as Survey from 'survey-knockout';
import * as SurveyJSWidgets from 'surveyjs-widgets';

export class FormService {
  constructor() {
    this.initCustomSurvey();
  }

  private initCustomSurvey() {
    Survey.StylesManager.Enabled = false;
    SurveyJSWidgets.select2tagbox(Survey);
    console.log(Survey.Serializer.findClass('tagbox'));
    this.initUsersComponent();
    console.log(Survey.Serializer.findClass('users'));
  }

  private initUsersComponent() {
    const component = {
      name: 'users',
      title: 'Users',
      category: 'Custom Questions',
      questionJSON: {
        name: 'users',
        type: 'tagbox',
        optionsCaption: 'Select users...',
        choicesOrder: 'asc',
        choices: [] as any[],
      },
      onInit: () => {},
      onLoaded: () => {},
      onAfterRender: () => {},
    };
    Survey.ComponentCollection.Instance.add(component);
  }
}
