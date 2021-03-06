'use strict';

const { username, trust, reference, contactMessage } = require('./paths');

const postContacts = {
  id: 'postContacts',
  properties: {
    body: {
      properties: {
        trust,
        to: {
          properties: {
            username
          },
          required: ['username']
        },
        message: contactMessage,
        reference
      },
      required: ['trust', 'to'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const patchConfirmContact = {
  id: 'patchConfirmContacts',
  properties: {
    body: {
      properties: {
        trust,
        reference,
        isConfirmed: {
          enum: [true]
        },
        id: {}
      },
      required: ['id', 'isConfirmed', 'trust', 'reference'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const patchUpdateContact = {
  id: 'patchUpdateContact',
  properties: {
    body: {
      properties: {
        trust,
        reference,
        message: contactMessage,
        id: {}
      },
      additionalProperties: false
    }
  }
};

module.exports = { postContacts, patchConfirmContact, patchUpdateContact };
