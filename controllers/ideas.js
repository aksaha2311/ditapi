'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Create idea
 */
async function post(req, res, next) {
  try {

    // gather data
    const { title, detail } = req.body;
    const creator = req.auth.username;

    // save the idea to database
    const newIdea = await models.idea.create({ title, detail, creator });

    // serialize the idea (JSON API)
    const serializedIdea = serialize.idea(newIdea);

    // respond
    return res.status(201).json(serializedIdea);

  } catch (e) {
    return next(e);
  }
}

/**
 * Read idea by id
 */
async function get(req, res, next) {
  try {
    // gather data
    const { id } = req.params;

    // read the idea from database
    const idea = await models.idea.read(id);

    if (!idea) return res.status(404).json({ });

    // serialize the idea (JSON API)
    const serializedIdea = serialize.idea(idea);

    // respond
    return res.status(200).json(serializedIdea);

  } catch (e) {
    return next(e);
  }
}

/**
 * Update idea's title or detail
 * PATCH /ideas/:id
 */
async function patch(req, res, next) {
  try {
    // gather data
    const { title, detail } = req.body;
    const { id } = req.params;
    const { username } = req.auth;

    // update idea in database
    const idea = await models.idea.update(id, { title, detail }, username);

    // serialize the updated idea (JSON API)
    const serializedIdea = serialize.idea(idea);

    // respond
    return res.status(200).json(serializedIdea);
  } catch (e) {
    // handle errors
    switch (e.code) {
      case 403: {
        return res.status(403).json({
          errors: [{ status: 403, detail: 'only creator can update' }]
        });
      }
      case 404: {
        return res.status(404).json({
          errors: [{ status: 404, detail: 'idea not found' }]
        });
      }
      default: {
        return next(e);
      }
    }
  }
}

module.exports = { get, patch, post };
