'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const userController = require(path.resolve('./controllers/users'));
const avatarController = require(path.resolve('./controllers/avatar'));
const validators = require(path.resolve('./controllers/validators')),
      authorize = require(path.resolve('./controllers/authorize'));

const go = require(path.resolve('./controllers/goto/users'));

const { parse } = require(path.resolve('./controllers/validators/parser'));

// post a new user
router.route('/')
  .post(validators.users.post, userController.postUsers);

// get new users who have common tags with me
router.route('/')
  .get(go.get.newWithMyTags, authorize.onlyLogged, parse, validators.users.getNewUsersWithMyTags, userController.getNewUsersWithMyTags);

// get users who have common tags with me
router.route('/')
  .get(go.get.withMyTags, authorize.onlyLogged, parse, validators.users.getUsersWithMyTags, userController.getUsersWithMyTags);

// get users who have given tags
router.route('/')
  .get(go.get.withTags, authorize.onlyLogged, parse, validators.users.getUsersWithTags, userController.getUsersWithTags);

// get users from given location
router.route('/')
  .get(go.get.withLocation, authorize.onlyLogged, parse, validators.users.getUsersWithLocation, userController.getUsersWithLocation);

// get new users
router.route('/')
  .get(go.get.new, authorize.onlyLogged, parse, validators.users.getNewUsers, userController.getNewUsers);

// get and patch user profile
router.route('/:username')
  .all(validators.params)
  .get(userController.getUser)
  .patch(authorize.onlyLoggedMe, validators.users.patch, userController.patchUser, userController.getUser);

/**
 * Routers for userTags
 */
router.route('/:username/tags')
  .all(validators.params)
  .post(authorize.onlyLoggedMe, validators.userTags.post, userController.postUserTags)
  .get(authorize.onlyLogged, userController.getUserTags);

router.route('/:username/tags/:tagname')
  .all(validators.params)
  .get(authorize.onlyLogged, userController.getUserTag)
  .patch(authorize.onlyLoggedMe, validators.userTags.patch, userController.patchUserTag, userController.getUserTag)
  .delete(authorize.onlyLoggedMe, userController.deleteUserTag);

router.route('/:username/avatar')
  .all(validators.params)
  .get(authorize.onlyLogged, parse, validators.avatar.get, avatarController.get)
  .patch(authorize.onlyLoggedMe, validators.avatar.patchHeaders, avatarController.parseAvatar, validators.avatar.patchFile, validators.avatar.patchFileType, avatarController.patch, avatarController.removeTemporaryFileOnError);

module.exports = router;
