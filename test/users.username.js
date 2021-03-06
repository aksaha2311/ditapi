'use strict';

const should = require('should'),
      _ = require('lodash'),
      path = require('path');

const agentFactory = require('./agent'),
      dbHandle = require(path.resolve('./test/handle-database'));

describe('/users/:username', function () {

  let agent,
      dbData,
      existentUser,
      loggedUser,
      unverifiedUser;

  const nonexistentUser = {
    username: 'nonexistent-user',
    email: 'nonexistent-email@example.com',
  };

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('GET', function () {
    beforeEach(async function () {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        userLocations: [
          [0, 0],
          [1, 1]
        ]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      existentUser = dbData.users[0];
      loggedUser = dbData.users[1];
      unverifiedUser = dbData.users[2];
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('[user exists]', function () {
      it('[logged] should read user`s profile', async function () {
        const response = await agentFactory.logged(loggedUser)
          .get(`/users/${existentUser.username}`)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const user = response.body;
        user.should.have.property('data');
        user.data.should.have.property('type', 'users');
        user.data.should.have.property('id', existentUser.username);
        user.data.should.have.property('attributes');
        const fields = user.data.attributes;
        fields.should.have.property('username', existentUser.username);
        fields.should.have.property('givenName');
        // TODO givenName, familyName, birthDate, profile, ...
      });

      it('[not logged] should read simplified profile', async function () {
        const response = await agent
          .get(`/users/${existentUser.username}`)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const user = response.body;

        should(user).have.property('data')
          .deepEqual({
            type: 'users',
            id: existentUser.username,
            attributes: {
              username: existentUser.username
            }
          });
      });

      it('[logged, not verified] should read simplified profile', async function () {
        const response = await agentFactory.logged(unverifiedUser)
          .get(`/users/${existentUser.username}`)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const user = response.body;
        user.should.have.property('data');
        user.data.should.have.property('type', 'users');
        user.data.should.have.property('id', existentUser.username);
        user.data.should.have.property('attributes');

        const fields = user.data.attributes;
        fields.should.have.property('username', existentUser.username);
        fields.should.not.have.property('givenName');
      });

      it('[logged, unverified] should be treated as not logged', async function () {
        const response = await agentFactory.logged(unverifiedUser)
          .get(`/users/${unverifiedUser.username}`)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const user = response.body;

        should(user).have.property('data')
          .deepEqual({
            type: 'users',
            id: unverifiedUser.username,
            attributes: {
              username: unverifiedUser.username
            }
          });

      });
    });

    context('[user doesn\'t exist]', function () {
      it('should show 404', async function () {
        await agent
          .get(`/users/${nonexistentUser.username}`)
          .expect(404)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('[username is invalid]', function () {
      it('should show 400', async function () {
        await agent
          .get('/users/this--is-an-invalid--username')
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

  describe('PATCH', function () {
    let loggedUser, otherUser;

    beforeEach(async function () {
      const data = {
        users: 2, // how many users to make
        verifiedUsers: [0] // which  users to make verified
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('logged in', function () {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('the edited user is the logged user', function () {
        // profile fields are givenName, familyName, description, birthday
        //
        it('should update 1 profile field', async function () {
          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  givenName: 'new-given-name'
                }
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('username', loggedUser.username);
          should(dt.attributes).have.property('givenName', 'new-given-name');
        });

        it('should update multiple profile fields', async function () {
          const attributes = {
            givenName: 'new-given-name',
            familyName: 'newFamily Name',
            description: 'this is a description'
          };

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('username', loggedUser.username);
          should(dt.attributes).have.property('givenName', attributes.givenName);
          should(dt.attributes).have.property('familyName', attributes.familyName);
          should(dt.attributes).have.property('description', attributes.description);
        });

        it('should sanitize XSS', async () => {
          const attributes = {
            // test trimming
            givenName: ' given name',
            // test stripping tags to plaintext
            familyName: '<a href="https://example.com">family name</a>',
            // test sanitizing xss in html input
            description: '<a href="javascript:alert(\'xss!\')">xss link</a> ahoj <script>alert(\'xss\')</script><a href="https://example.com">valid link</a>'
          };

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt.attributes).have.property('givenName', 'given name');
          should(dt.attributes).have.property('familyName', 'family name');
          should(dt.attributes).have.property('description', 'ahoj <a href="https://example.com">valid link</a>');
        });

        it('should error when profile fields are mixed with settings or email', async function () {
          const attributes = {
            givenName: 'new-given-name',
            familyName: 'newFamily Name',
            description: 'this is a description',
            email: 'email@example.com'
          };

          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('should fail with 400 when not valid data in body provided', async function () {
          const tooLongValue = _.repeat('.', 4000);
          const attributes = {
            givenName: tooLongValue,
            familyName: tooLongValue,
            description: tooLongValue
          };

          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('should fail with 400 when url username doesn\'t match the username in body.data.id', async function () {
          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: otherUser.username,
                attributes: {
                  givenName: 'new-given-name'
                }
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });
      });

      context('the edited user is not the logged one', function () {
        it('should error with 403 Not Authorized', async function () {
          await agent
            .patch(`/users/${otherUser.username}`)
            .send({
              data: {
                type: 'users',
                id: otherUser.username,
                attributes: {
                  givenName: 'new-given-name'
                }
              }
            })
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });
      });
    });

    context('not logged in', function () {
      it('should error with 403 Not Authorized', async function () {
        await agent
          .patch(`/users/${otherUser.username}`)
          .send({
            data: {
              type: 'users',
              id: otherUser.username,
              attributes: {
                givenName: 'new-given-name'
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(403);
      });
    });
  });

  describe('DELETE', function () {
    it('should delete user and all her graph connections');
    it('should delete user\'s profile picture');
  });
});
