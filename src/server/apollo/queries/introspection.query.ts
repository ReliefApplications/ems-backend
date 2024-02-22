/** Introspection query, to be used to infer resources / refdata types */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const INTROSPECTION_QUERY = `query GetQueryTypes {
  __schema {
    types {
      name
      kind
      fields {
        name
        args {
          name
          type {
            name
            kind
            inputFields {
              name
              type {
                name
                kind
              }
            }
          }
        }
        type {
          name
          kind
          fields {
            name
            args {
              name
              type {
                name
                kind
                inputFields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
            }
            type {
              name
              kind
              ofType {
                name
                fields {
                  name
                  type {
                    name
                    kind
                    ofType {
                      name
                    }
                  }
                }
              }
            }
          }
          ofType {
            name
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                }
              }
            }
          }
        }
      }
    }
    queryType {
      name
      kind
      fields {
        name
        args {
          name
          type {
            name
            kind
            inputFields {
              name
              type {
                name
                kind
              }
            }
          }
        }
        type {
          name
          kind
          ofType {
            name
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
}`;

/**
 * Represents the result of a GraphQL introspection query.
 */
export type IntrospectionResult = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __schema: any;
};
