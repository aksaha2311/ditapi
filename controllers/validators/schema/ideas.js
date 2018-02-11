'use strict';

const { title, detail, id } = require('./paths');

const postIdeas = {
  properties: {
    body: {
      properties: {
        title,
        detail
      },
      required: ['title', 'detail'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getIdea = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const patchIdea = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      oneOf: [
        {
          properties: { title, detail, id },
          required: ['title', 'detail', 'id'],
          additionalProperties: false
        },
        {
          properties: { title, id },
          required: ['title', 'id'],
          additionalProperties: false
        },
        {
          properties: { detail, id },
          required: ['detail', 'id'],
          additionalProperties: false
        }
      ]
    }
  },
  required: ['body', 'params']
};

module.exports = { getIdea, patchIdea, postIdeas };
