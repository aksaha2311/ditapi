'use strict';

const _ = require('lodash');

const rules = require('./rules');

exports.post = function (req, res, next) {
  let errors = [];

  // check if the body has and only has the expected attributes
  const expectedAttrs = ['trust', 'reference', 'message', 'to'];
  const attrs = Object.keys(req.body);
  const missingAttrs = _.difference(expectedAttrs, attrs);

  const invalidAttrs = _.difference(attrs, expectedAttrs);

  if (missingAttrs.length > 0) {
    errors.push({
      msg: 'incomplete request',
      value: `missing attributes: ${missingAttrs.join(', ')}`
    });
  }

  if (invalidAttrs.length > 0) {
    errors.push({
      msg: 'invalid request',
      value: `invalid attributes: ${invalidAttrs.join(', ')}`
    });
  }

  // check that the target username is valid
  req.body.username = req.body.to.username;
  req.checkBody(_.pick(rules.user, ['username']));
  delete req.body.username;

  // check that reference is valid
  req.checkBody(_.pick(rules.contact, ['reference']));

  // check that trust level is valid
  const isTrustValid = [1, 2, 4, 8].indexOf(req.body.trust) > -1;
  if(!isTrustValid) {
    errors.push({
      param: 'trust',
      msg: 'the trust level is invalid',
      value: req.body.trust
    });
  }

  // prepare and return errors
  errors = errors.concat(req.validationErrors() || []);

  // check whether the contact is not sent to self
  const isToSelf = req.body.to.username === req.auth.username;

  if (isToSelf) {
    errors.push({
      param: 'to',
      msg: 'you cannot create a contact to yourself',
      value: req.body.to.username
    });
  }

  const errorOutput = { errors: [] };
  if (_.isArray(errors) && errors.length > 0) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};
