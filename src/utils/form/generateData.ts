import { faker } from '@faker-js/faker';
import { Record, Role, User, ReferenceData } from '@models';
import { isNil } from 'lodash';

export type FieldsConfig = {
  field: string;
  setDefault: boolean;
  default?: any;
  minDate?: string;
  maxDate?: string;
  minTime?: string;
  maxTime?: string;
  minNumber?: number;
  maxNumber?: number;
  phoneFormat?: string;
  textSource?:
    | 'lorem'
    | 'name'
    | 'firstName'
    | 'lastName'
    | 'jobTitle'
    | 'product'
    | 'company';
};

/**
 * Generate data for a record based on the form structure
 *
 * @param fields list of fields
 * @param form form object
 */
export const generateData = async (fields: any, form: any) => {
  const data = {};
  const extractQuestions = (elements: any[]) => {
    let questionsStructure: any[] = [];
    elements.forEach((element: any) => {
      if (element.elements) {
        // If the element has elements property, it's either a page or a panel
        questionsStructure = questionsStructure.concat(
          extractQuestions(element.elements)
        );
      } else {
        questionsStructure.push(element);
      }
    });
    return questionsStructure;
  };

  const questionsStructure = extractQuestions(
    JSON.parse(form.structure).pages.reduce(
      (acc: any, page: any) => acc.concat(page.elements),
      []
    )
  );

  const getChoicesFromQuestion = async (question: any) => {
    const questionToBeCopied = questionsStructure.find(
      (obj: any) => obj.name === question
    );
    if (questionToBeCopied.referenceData) {
      const refData = await ReferenceData.findOne({
        _id: questionToBeCopied.referenceData,
      });
      if (refData) {
        return refData.data.map((item) => item[refData.valueField]);
      }
    } else if (questionToBeCopied.choices) {
      return questionToBeCopied.choices?.map((item) =>
        typeof item === 'object' ? item.value : item
      );
    }
    return question.choices?.map((item) =>
      typeof item === 'object' ? item.value : item
    );
  };

  const generateFieldData = async (
    questionStructure: any,
    options: FieldsConfig
  ) => {
    const type = questionStructure.inputType ?? questionStructure.type;
    let questionChoices = [];
    if (questionStructure.referenceData) {
      const refData = await ReferenceData.findOne({
        _id: questionStructure.referenceData,
      });
      if (refData) {
        const refDataChoices = refData.data.map(
          (item) => item[refData.valueField]
        );
        questionChoices = refDataChoices;
      }
    } else if (questionStructure.choicesFromQuestion) {
      questionChoices = await getChoicesFromQuestion(
        questionStructure.choicesFromQuestion
      );
    } else if (questionStructure.choices) {
      questionChoices = questionStructure.choices?.map((item) =>
        typeof item === 'object' ? item.value : item
      );
    }

    const fiveYearsAgo = new Date(
      new Date().getTime() - 5 * 365 * 24 * 60 * 60 * 1000
    );
    const fiveYearsFromNow = new Date(
      new Date().getTime() + 5 * 365 * 24 * 60 * 60 * 1000
    );

    switch (type) {
      case 'text':
        switch (options.textSource) {
          case 'company':
            return faker.company.name();
          case 'firstName':
            return faker.name.firstName();
          case 'jobTitle':
            return faker.name.jobTitle();
          case 'lastName':
            return faker.name.lastName();
          case 'name':
            return faker.name.fullName();
          case 'product':
            return faker.commerce.productName();
          case 'lorem':
          default:
            return faker.lorem.sentence();
        }
      case 'color':
        return faker.internet.color();
      case 'date':
      case 'datetime-local':
        const date = new Date(
          faker.date.between(
            options.minDate ?? fiveYearsAgo.toISOString(),
            options.maxDate ?? fiveYearsFromNow.toISOString()
          )
        ).toISOString();

        return type === 'date' ? date.slice(0, 10) + 'T00:00:00.000Z' : date;
      case 'email':
        return faker.internet.email();
      case 'number':
        return faker.datatype.number({
          min: options.minNumber ?? 0,
          max: options.maxNumber ?? 1000,
        });
      case 'tel':
        return faker.phone.number(options.phoneFormat ?? '+1 (###) ###-####');
      case 'time':
        return new Date(
          faker.date.between(
            options.minTime ?? '1970-01-01T00:00:00.000Z',
            options.maxTime ?? '1970-01-01T23:59:59.999'
          )
        ).toISOString();
      case 'url':
        return faker.internet.url();
      case 'month':
        return faker.date
          .between(fiveYearsAgo, fiveYearsFromNow)
          .toISOString()
          .slice(0, 7);
      case 'password':
        return faker.internet.password();
      case 'range':
        return faker.datatype.number({
          min: 0,
          max: 100,
        });
      case 'week':
        return (
          faker.datatype.number({
            min: fiveYearsAgo.getFullYear(),
            max: fiveYearsFromNow.getFullYear(),
          }) +
          '-W' +
          faker.datatype.number({ min: 1, max: 52 })
        );
      case undefined:
      case 'comment':
        return faker.lorem.paragraph();
      case 'radiogroup':
      case 'dropdown':
        // If the choices are set with values != texts, we only want the values
        // If the choices are set with values == texts, choices is an array of strings
        return questionChoices[
          faker.datatype.number({
            min: 0,
            max: questionChoices.length - 1,
          })
        ];
      case 'tagbox':
      case 'checkbox':
        const choices = [];
        questionChoices.forEach((choice: any) => {
          if (faker.datatype.boolean()) {
            choices.push(choice);
          }
        });
        if (choices.length === 0 && questionChoices.length > 0) {
          choices.push(
            questionChoices[
              faker.datatype.number({
                min: 0,
                max: questionChoices.length - 1,
              })
            ]
          );
        }
        return choices;
      case 'boolean':
        return faker.datatype.boolean();
      case 'multipletext':
        const items = {};
        questionStructure.items.forEach((item: any) => {
          items[item.name] = faker.lorem.sentence();
        });
        return items;
      case 'matrix':
        const matrixItems = {};
        questionStructure.rows.forEach((row: any) => {
          matrixItems[row.value] =
            questionStructure.columns[
              faker.datatype.number({
                min: 0,
                max: questionStructure.columns.length - 1,
              })
            ].value;
        });
        return matrixItems;
      case 'matrixdropdown':
        const matrixDropdownItems = {};
        questionStructure.rows.forEach((row: any) => {
          matrixDropdownItems[row.value] = {};
          questionStructure.columns.forEach(async (column: any) => {
            let matrixDropdownChoices = [];
            if (column.choicesFromQuestion) {
              matrixDropdownChoices = await getChoicesFromQuestion(
                column.choicesFromQuestion
              );
            } else {
              matrixDropdownChoices = column.choices?.map((item) =>
                typeof item === 'object' ? item.value : item
              );
            }
            // If choices are set for the column, use them, otherwise use the choices set for the question
            const columnChoices = matrixDropdownChoices ?? questionChoices;
            switch (column.cellType) {
              case null:
              case undefined: // Undefined(default) is a dropdown which always uses the question choices
                matrixDropdownItems[row.value][column.name] = questionChoices[
                  faker.datatype.number({
                    min: 0,
                    max: questionChoices.length - 1,
                  })
                ].map((item) => (typeof item === 'object' ? item.value : item));
                break;
              case 'dropdown':
              case 'radiogroup':
                matrixDropdownItems[row.value][column.name] =
                  columnChoices[
                    faker.datatype.number({
                      min: 0,
                      max: columnChoices.length - 1,
                    })
                  ];
                break;
              case 'checkbox':
              case 'tagbox':
                const resChoices = [];
                columnChoices.forEach((choice: any) => {
                  if (faker.datatype.boolean()) {
                    resChoices.push(choice);
                  }
                });
                if (resChoices.length === 0) {
                  resChoices.push(
                    columnChoices[
                      faker.datatype.number({
                        min: 0,
                        max: columnChoices.length - 1,
                      })
                    ]
                  );
                }
                matrixDropdownItems[row.value][column.name] = resChoices;
                break;
              case 'boolean':
                matrixDropdownItems[row.value][column.name] =
                  faker.datatype.boolean();
                break;
              case 'text':
              case 'comment':
                matrixDropdownItems[row.value][column.name] =
                  faker.lorem.sentence();
                break;
              case 'rating':
                matrixDropdownItems[row.value][column.name] =
                  faker.datatype.number({ min: 1, max: 5 });
                break;
              case 'expression':
                break;
              default:
                break;
            }
          });
        });
        return matrixDropdownItems;
      case 'matrixdynamic':
        const matrixDynamicItems = [];
        // Since we don't know the number of rows, we'll generate a random number of rows between 1 and 5
        for (let i = 0; i < faker.datatype.number({ min: 1, max: 5 }); i++) {
          const matrixDynamicItem = {};
          questionStructure.columns.forEach(async (column: any) => {
            let matrixDynamicChoices = [];
            if (column.choicesFromQuestion) {
              matrixDynamicChoices = await getChoicesFromQuestion(
                column.choicesFromQuestion
              );
            } else {
              matrixDynamicChoices = column.choices?.map((item) =>
                typeof item === 'object' ? item.value : item
              );
            }
            const columnChoices = matrixDynamicChoices ?? questionChoices;
            switch (column.cellType) {
              case null:
              case undefined:
                matrixDynamicItem[column.name] =
                  questionChoices[
                    faker.datatype.number({
                      min: 0,
                      max: questionChoices.length - 1,
                    })
                  ];
                break;
              case 'dropdown':
              case 'radiogroup':
                matrixDynamicItem[column.name] =
                  columnChoices[
                    faker.datatype.number({
                      min: 0,
                      max: columnChoices.length - 1,
                    })
                  ];
                break;
              case 'checkbox':
              case 'tagbox':
                const resChoices = [];
                columnChoices.forEach((choice: any) => {
                  if (faker.datatype.boolean()) {
                    resChoices.push(choice);
                  }
                });
                if (resChoices.length === 0 && columnChoices.length > 0) {
                  resChoices.push(
                    columnChoices[
                      faker.datatype.number({
                        min: 0,
                        max: columnChoices.length - 1,
                      })
                    ]
                  );
                }
                matrixDynamicItem[column.name] = resChoices;
                break;
              case 'boolean':
                matrixDynamicItem[column.name] = faker.datatype.boolean();
                break;
              case 'text':
              case 'comment':
                matrixDynamicItem[column.name] = faker.lorem.sentence();
                break;
              case 'rating':
                matrixDynamicItem[column.name] = faker.datatype.number({
                  min: 1,
                  max: 5,
                });
                break;
              case 'expression':
                break;
              default:
                break;
            }
          });
          matrixDynamicItems.push(matrixDynamicItem);
        }
        return matrixDynamicItems;
      case 'expression':
        return;
      case 'resource':
        const record = await Record.findOne({
          resource: questionStructure.resource,
          archived: { $ne: true },
        }).skip(
          faker.datatype.number({
            min: 0,
            max:
              (await Record.countDocuments({
                resource: questionStructure.resource,
                archived: { $ne: true },
              })) - 1,
          })
        );
        return record.id;

      case 'resources':
        const records = await Record.find({
          resource: questionStructure.resource,
          archived: { $ne: true },
        }).skip(
          faker.datatype.number({
            min: 0,
            max:
              (await Record.countDocuments({
                resource: questionStructure.resource,
                archived: { $ne: true },
              })) - 1,
          })
        );
        return records.map((x) => x.id);

      case 'owner':
        const roles = [];
        await Promise.all(
          questionStructure.applications?.map(async (application: any) => {
            const tempRoles = await Role.find({
              application,
            });
            tempRoles.forEach((role: any) => {
              if (faker.datatype.boolean()) {
                roles.push(role.id);
              }
            });
            if (
              questionStructure.isRequired && // If the question is required we push a random role if none are generated
              roles.length === 0 &&
              tempRoles.length > 0
            ) {
              roles.push(
                tempRoles[
                  faker.datatype.number({
                    min: 0,
                    max: tempRoles.length - 1,
                  })
                ].id
              );
            }
          })
        );
        return roles;
      case 'users':
        const users = [];
        if (questionStructure.applications) {
          // If an application is set in the question, we only get users with roles in that application
          await Promise.all(
            questionStructure.applications.map(async (application: any) => {
              const tempRoles = await Role.find({
                application,
              });
              for (const role of tempRoles) {
                const tempUsers = await User.find({
                  roles: role.id,
                });
                for (const user of tempUsers) {
                  if (faker.datatype.boolean() && !users.includes(user.id)) {
                    users.push(user.id);
                  }
                }
                if (
                  questionStructure.isRequired &&
                  users.length === 0 &&
                  tempUsers.length > 0
                ) {
                  users.push(
                    tempUsers[
                      faker.datatype.number({
                        min: 0,
                        max: tempUsers.length - 1,
                      })
                    ].id
                  );
                }
              }
            })
          );
        } else {
          // If no application is set, we get any users
          const tempUsers = await User.find();
          for (const user of tempUsers) {
            if (faker.datatype.boolean()) {
              users.push(user.id);
            }
          }
          if (
            questionStructure.isRequired &&
            users.length === 0 &&
            tempUsers.length > 0
          ) {
            users.push(
              tempUsers[
                faker.datatype.number({
                  min: 0,
                  max: tempUsers.length - 1,
                })
              ].id
            );
          }
        }
        return users;
      case 'geospatial':
        const coordinates = [
          Number(faker.address.longitude()),
          Number(faker.address.latitude()),
        ];
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
          properties: {
            coordinates,
            city: faker.address.city(),
            countryName: faker.address.country(),
            countryCode: faker.address.countryCode(),
            district: faker.address.county(),
            region: faker.address.state(),
            street: faker.address.streetName(),
            subRegion: faker.address.stateAbbr(),
            address: faker.address.streetAddress(),
          },
        };
      case 'paneldynamic':
        const panelData = [];
        for (let i = 0; i < faker.datatype.number({ min: 1, max: 5 }); i++) {
          const panelItem = {};
          await Promise.all(
            questionStructure.templateElements?.map(
              async (panelQuestion: any) => {
                panelItem[panelQuestion.name] = await generateFieldData(
                  panelQuestion,
                  {
                    field: panelQuestion.field,
                    setDefault: false,
                  }
                );
              }
            )
          );
          panelData.push(panelItem);
        }
        return panelData;
      default:
        return faker.lorem.sentence();
    }
  };

  await Promise.all(
    fields.map(async (field: any) => {
      const questionStructure = questionsStructure.find(
        (obj: any) => obj.name === field.field
      );
      const opts = {
        field: field.field,
        setDefault: field.setDefault,
        minDate: field.minDate,
        maxDate: field.maxDate,
        minNumber: field.minNumber,
        maxNumber: field.maxNumber,
        minTime: field.minTime,
        maxTime: field.maxTime,
        phoneFormat: field.phoneFormat,
        textSource: field.textSource,
      };

      data[questionStructure.name] =
        field.setDefault && !isNil(field.default)
          ? field.default
          : await generateFieldData(questionStructure, opts);
    })
  );

  return data;
};
