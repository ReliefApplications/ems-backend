import * as Survey from 'survey-knockout';
import { ICustomQuestionTypeConfiguration } from 'survey-knockout';

/**
 * Form service, for SurveyJS validation.
 */
export class FormService {
  /**
   * Form service.
   */
  constructor() {
    this.initCustomSurvey();
  }

  /**
   * Add all custom components.
   */
  private initCustomSurvey() {
    Survey.StylesManager.Enabled = false;
    this.initResourceComponent();
    this.initResourcesComponent();
    this.initOwnerComponent();
    this.initUsersComponent();
  }

  /**
   * Init resource component.
   */
  private initResourceComponent() {
    const component: ICustomQuestionTypeConfiguration = {
      name: 'resource',
      title: 'Resource',
      questionJSON: {
        name: 'resource',
        type: 'dropdown',
        choicesOrder: 'asc',
        choices: [] as any[],
      },
      onInit: () => {},
      onCreated: () => {},
      onLoaded: () => {},
      onAfterRender: () => {},
      onAfterRenderContentElement: () => {},
      onPropertyChanged: () => {},
      onValueChanged: () => {},
      onItemValuePropertyChanged: () => {},
    };
    Survey.ComponentCollection.Instance.add(component);
  }

  /**
   * Init resources component.
   */
  private initResourcesComponent() {
    const component: ICustomQuestionTypeConfiguration = {
      name: 'resources',
      title: 'Resources',
      questionJSON: {
        name: 'resources',
        type: 'tagbox',
        choicesOrder: 'asc',
        choices: [] as any[],
      },
      onInit: () => {},
      onCreated: () => {},
      onLoaded: () => {},
      onAfterRender: () => {},
      onAfterRenderContentElement: () => {},
      onPropertyChanged: () => {},
      onValueChanged: () => {},
      onItemValuePropertyChanged: () => {},
    };
    Survey.ComponentCollection.Instance.add(component);
  }

  /**
   * Init owner component.
   */
  private initOwnerComponent() {
    const component: ICustomQuestionTypeConfiguration = {
      name: 'owner',
      title: 'Owner',
      questionJSON: {
        name: 'owner',
        type: 'tagbox',
        choicesOrder: 'asc',
        choices: [] as any[],
      },
      onInit: () => {},
      onCreated: () => {},
      onLoaded: () => {},
      onAfterRender: () => {},
      onAfterRenderContentElement: () => {},
      onPropertyChanged: () => {},
      onValueChanged: () => {},
      onItemValuePropertyChanged: () => {},
    };
    Survey.ComponentCollection.Instance.add(component);
  }

  /**
   * Init users component.
   */
  private initUsersComponent() {
    const component: ICustomQuestionTypeConfiguration = {
      name: 'users',
      title: 'Users',
      questionJSON: {
        name: 'users',
        type: 'tagbox',
        choicesOrder: 'asc',
        choices: [] as any[],
      },
      onInit: () => {},
      onCreated: () => {},
      onLoaded: () => {},
      onAfterRender: () => {},
      onAfterRenderContentElement: () => {},
      onPropertyChanged: () => {},
      onValueChanged: () => {},
      onItemValuePropertyChanged: () => {},
    };
    Survey.ComponentCollection.Instance.add(component);
  }
}
