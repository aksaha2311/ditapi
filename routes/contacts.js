'use strict';

const express = require('express'),
      path = require('path');

const contactController = require(path.resolve('./controllers/contacts'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));

const router = express.Router();

// basic authenticator
router.route('/')
  .post(authorize.onlyLogged, validators.contacts.post, contactController.postContacts);

module.exports = router;
