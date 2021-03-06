'use strict';

const path = require('path'),
      should = require('should');

const dbHandle = require('./handle-database');
const agentFactory = require('./agent');
const models = require(path.resolve('./models'));

describe('tags of idea', () => {

  let agent,
      dbData,
      existentIdea,
      loggedUser,
      otherUser,
      tag0,
      tag1;

  beforeEach(() => {
    agent = agentFactory();
  });

  beforeEach(async () => {
    const data = {
      users: 3, // how many users to make
      verifiedUsers: [0, 1], // which  users to make verified
      tags: 5,
      ideas: [
        [{ }, 0],
        [{ }, 1]
      ],
      // ideaTag [0, 0] shouldn't be created here; is created in tests for POST
      ideaTags: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 4]]
    };
    // create data in database
    dbData = await dbHandle.fill(data);

    [loggedUser, otherUser] = dbData.users;
    [existentIdea] = dbData.ideas;
    [tag0, tag1] = dbData.tags;
  });

  afterEach(async () => {
    await dbHandle.clear();
  });

  describe('POST /ideas/:id/tags', () => {
    let postBody;

    beforeEach(() => {
      postBody = { data: {
        type: 'idea-tags',
        relationships: {
          tag: { data: { type: 'tags', id: tag0.tagname } }
        }
      } };
    });

    context('logged as idea creator', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', () => {
        it('[idea and tag exist and ideaTag doesn\'t] 201', async () => {
          const response = await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(201);

          const ideaTagDb = await models.ideaTag.read(existentIdea.id, tag0.tagname);
          should(ideaTagDb).match({
            idea: { id: existentIdea.id },
            tag: { tagname: tag0.tagname },
            creator: { username: loggedUser.username }
          });

          should(response.body).match({
            data: {
              type: 'idea-tags',
              id: `${existentIdea.id}--${tag0.tagname}`,
              relationships: {
                idea: { data: { type: 'ideas', id: existentIdea.id } },
                tag: { data: { type: 'tags', id: tag0.tagname } },
                creator: { data: { type: 'users', id: loggedUser.username } }
              }
            }
          });
        });

        it('[duplicate ideaTag] 409', async () => {
          // first it's ok
          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(201);

          // duplicate request should error
          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(409);
        });

        it('[idea doesn\'t exist] 404', async () => {
          const response = await agent
            .post('/ideas/00000000/tags')
            .send(postBody)
            .expect(404);

          should(response.body).deepEqual({
            errors: [{
              status: 404,
              detail: 'idea not found'
            }]
          });
        });

        it('[tag doesn\'t exist] 404', async () => {
          // set nonexistent tag in body
          postBody.data.relationships.tag.data.id = 'nonexistent-tag';

          const response = await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(404);

          should(response.body).deepEqual({
            errors: [{
              status: 404,
              detail: 'tag not found'
            }]
          });
        });

      });

      context('invalid data', () => {
        it('[invalid id] 400', async () => {
          await agent
            .post('/ideas/invalid-id/tags')
            .send(postBody)
            .expect(400);
        });

        it('[invalid tagname] 400', async () => {
          // invalidate tagname
          postBody.data.relationships.tag.data.id = 'invalidTagname';

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });

        it('[missing tagname] 400', async () => {
          // invalidate tagname
          delete postBody.data.relationships.tag;

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });

        it('[additional properties in body] 400', async () => {
          // add some attributes (or relationships)
          postBody.data.attributes = { foo: 'bar' };

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });
      });

    });

    context('logged, not idea creator', () => {
      beforeEach(() => {
        agent = agentFactory.logged(otherUser);
      });

      it('403', async () => {
        const response = await agent
          .post(`/ideas/${existentIdea.id}/tags`)
          .send(postBody)
          .expect(403);

        should(response.body).deepEqual({
          errors: [{ status: 403, detail: 'not logged in as idea creator' }]
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .post(`/ideas/${existentIdea.id}/tags`)
          .send(postBody)
          .expect(403);
      });
    });
  });

  describe('GET /ideas/:id/tags', () => {
    context('logged', () => {

      beforeEach(() => {
        agent = agentFactory.logged();
      });

      context('valid data', () => {
        it('[idea exists] 200 and list of idea-tags', async () => {
          const response = await agent
            .get(`/ideas/${existentIdea.id}/tags`)
            .expect(200);

          const responseData = response.body.data;

          should(responseData).Array().length(4);
        });

        it('[idea doesn\'t exist] 404', async () => {
          const response = await agent
            .get('/ideas/00000001/tags')
            .expect(404);

          should(response.body).match({ errors: [{
            status: 404,
            detail: 'idea not found'
          }] });
        });
      });

      context('invalid data', () => {
        it('[invalid id] 400', async () => {
          await agent
            .get('/ideas/invalidId/tags')
            .expect(400);
        });
      });

    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .get(`/ideas/${existentIdea.id}/tags`)
          .expect(403);
      });
    });

  });

  describe('DELETE /ideas/:id/tags/:tagname', () => {

    context('logged as idea creator', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', () => {
        it('[idea-tag exists] 204', async () => {
          const ideaTag = await models.ideaTag.read(existentIdea.id, tag1.tagname);

          // first ideaTag exists
          should(ideaTag).Object();

          await agent
            .delete(`/ideas/${existentIdea.id}/tags/${tag1.tagname}`)
            .expect(204);

          const ideaTagAfter = await models.ideaTag.read(existentIdea.id, tag1.tagname);
          // then ideaTag doesn't exist
          should(ideaTagAfter).be.undefined();

        });

        it('[idea-tag doesn\'t exist] 404', async () => {
          await agent
            .delete(`/ideas/${existentIdea.id}/tags/${tag0.tagname}`)
            .expect(404);
        });
      });

      context('invalid data', () => {
        it('[invalid id] 400', async () => {
          await agent
            .delete(`/ideas/invalid-id/tags/${tag1.tagname}`)
            .expect(400);
        });

        it('[invalid tagname] 400', async () => {
          await agent
            .delete(`/ideas/${existentIdea.id}/tags/invalid--tagname`)
            .expect(400);
        });
      });

    });

    context('logged, not idea creator', () => {

      beforeEach(() => {
        agent = agentFactory.logged(otherUser);
      });

      it('403', async () => {
        const response = await agent
          .delete(`/ideas/${existentIdea.id}/tags/${tag1.tagname}`)
          .expect(403);

        should(response.body).deepEqual({
          errors: [{ status: 403, detail: 'not logged in as idea creator' }]
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        const response = await agent
          .delete(`/ideas/${existentIdea.id}/tags/${tag1.tagname}`)
          .expect(403);

        should(response.body).not.deepEqual({
          errors: [{ status: 403, detail: 'not logged in as idea creator' }]
        });
      });
    });

  });
});
