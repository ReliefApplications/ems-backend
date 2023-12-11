import * as Survey from 'survey-knockout';

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
    this.initGeoSpatialComponent();
  }

  /**
   * Init resource component.
   */
  private initResourceComponent() {
    const component = {
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
    const component = {
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
    const component = {
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
    const component = {
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

  /**
   * Init GeoSpatial component.
   */
  private initGeoSpatialComponent() {
    const component: Survey.ICustomQuestionTypeConfiguration = {
      name: 'geospatial',
      title: 'Geospatial',
      questionJSON: {
        name: 'geospatial',
        type: 'text',
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
