import * as Survey from 'survey-knockout';

/** types for the surveyjs question types */
export enum questionType {
  BOOLEAN = 'boolean',
  CHECKBOX = 'checkbox',
  COMMENT = 'comment',
  EDITOR = 'editor',
  EXPRESSION = 'expression',
  DROPDOWN = 'dropdown',
  FILE = 'file',
  GEOSPATIAL = 'geospatial',
  HTML = 'html',
  MATRIX = 'matrix',
  MATRIX_DROPDOWN = 'matrixdropdown',
  MATRIX_DYNAMIC = 'matrixdynamic',
  MULTIPLE_TEXT = 'multipletext',
  OWNER = 'owner',
  PANEL = 'panel',
  PANEL_DYNAMIC = 'paneldynamic',
  RADIO_GROUP = 'radiogroup',
  RESOURCES = 'resources',
  RESOURCE = 'resource',
  SELECT = 'select',
  TAGBOX = 'tagbox',
  TEXT = 'text',
  USERS = 'users',
}

/** Input type for text questions */
export enum inputType {
  COLOR = 'color',
  DATE = 'date',
  DATETIME_LOCAL = 'datetime-local',
  DATETIME = 'datetime',
  DECIMAL = 'decimal',
  EMAIL = 'email',
  NUMBER = 'number',
  NUMERIC = 'numeric',
  TIME = 'time',
  TEL = 'tel',
  TEXT = 'text',
  URL = 'url',
}

/** Input type for text questions */
export enum displayStyle {
  DATE = 'date',
  DECIMAL = 'decimal',
  CURRENCY = 'currency',
  PERCENT = 'percent',
  NUMBER = 'number',
}

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
        type: questionType.DROPDOWN,
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
        type: questionType.TAGBOX,
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
        type: questionType.TAGBOX,
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
        type: questionType.TAGBOX,
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
        type: questionType.TEXT,
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
