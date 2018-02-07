'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      commentControllers = require(path.resolve('./controllers/comments')),
      ideaControllers = require(path.resolve('./controllers/ideas')),
      ideaTagControllers = require(path.resolve('./controllers/idea-tags')),
      commentValidators = require(path.resolve('./controllers/validators/comments')),
      ideaValidators = require(path.resolve('./controllers/validators/ideas')),
      ideaTagValidators = require(path.resolve('./controllers/validators/idea-tags'));

router.route('/')
  // post a new idea
  .post(authorize.onlyLogged, ideaValidators.post, ideaControllers.post);

router.route('/:id')
  // read idea by id
  .get(authorize.onlyLogged, ideaValidators.get, ideaControllers.get)
  .patch(authorize.onlyLogged, ideaValidators.patch, ideaControllers.patch);

router.route('/:id/tags')
  .post(authorize.onlyLogged, ideaTagValidators.post, ideaTagControllers.post)
  .get(authorize.onlyLogged, ideaTagValidators.get, ideaTagControllers.get);

router.route('/:id/tags/:tagname')
  .delete(authorize.onlyLogged, ideaTagValidators.del, ideaTagControllers.del);

router.route('/:id/comments')
  // create a new comment to the idea
  .post(authorize.onlyLogged, commentValidators.post, commentControllers.post);

module.exports = router;
