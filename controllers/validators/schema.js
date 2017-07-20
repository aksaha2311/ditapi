module.exports = {
  definitions: {
    user: {
      username: {
        type: 'string',
        minLength: 1,
        pattern: '^(?=.{2,32}$)[a-z0-9]+([\\_\\-\\.][a-z0-9]+)*$'
      },
      email: {
        type: 'string',
        minLength: 1,
        pattern: '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'
      },
      givenName: {
        maxLength: 128
      },
      familyName: {
        maxLength: 128
      },
      desc: {
        maxLength: 2048
      },
      password: {
        maxLength: 512,
        minLength: 8
      },
      code: {
        type: 'string',
        minLength: 1,
        pattern: '^[0-9a-f]{32}$'
      }
    },
    tag: {
      tagname: {
        type: 'string',
        minLength: 1,
        pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
      }
    }
  },
  postUsers: {
    id: 'postUsers',
    body: {
      properties: {
        email: {
          $ref : 'sch#/definitions/user/email'
        },
        username: { $ref : 'sch#/definitions/user/username'},
        password: { '$ref': 'sch#/definitions/user/password'}
      }
    }
  },
  newUsers: {
    id: 'newUsers',
    query: {
      properties: {
        sort: {
          type: 'string'
        },
        page: {
          type: 'object',
          properties: {
            limit: {
              type: 'number'
            },
            offset: {
              type: 'number'
            }
          },
          required: ['limit', 'offset'],
          additionalProperties: false
        }
      },
      required: ['sort', 'page'],
      additionalProperties: false
    }
  },
  newUsersWithMyTags: {
    id: 'newUsersWithMyTags',
    query:{
      properties:{
        sort: {
          type: 'string',
          pattern: '^-created$'
        },
        filter: {
          properties: {
            withMyTags: {
              type: 'number',
            }
          },
          required: ['withMyTags'],
          additionalProperties: false
        },
        page: {
          properties: {
            offset: {
              type: 'number'
            },
            limit: {
              type: 'number'
            }
          },
          required: ['offset', 'limit'],
          additionalProperties: false
        }
      },
      required: ['sort', 'filter', 'page'],
      additionalProperties: false
    }
  },
  getUsersWithTags: {
    id: 'getUsersWithTags',
    query: {
      properties: {
        filter: {
          properties: {
            tag: {
              type: 'array',
              items: { $ref : 'sch#/definitions/tag/tagname' }
            }
          },
          required: ['tag'],
          additionalProperties : false
        }
      },
      required: ['filter'],
      additionalProperties: false
    }
  }
};
