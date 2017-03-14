'use strict';

const _ = require('lodash'),
      path = require('path');

const Model = require(path.resolve('./models/model')),
      account = require('./account'),
      schema = require('./schema');

class User extends Model {

  // save a new user to a database
  static async create(user) {
    // generate an email verification code
    const emailVerifyCode = await account.generateHexCode(32);
    user.emailVerifyCode = emailVerifyCode;

    // generate a user object in a standard shape
    user = await schema(user);

    // save the user into a database
    await this.db.query('INSERT @user IN users', { user });

    // return some information
    return { emailVerifyCode };
  }

  // read a user by username
  static async read(username) {
    const query = 'FOR u IN users FILTER u.username == @username RETURN u';
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async update(username, newData) {
    const profile = _.pick(newData, ['givenName', 'familyName', 'description']);
    const query = `FOR u IN users FILTER u.username == @username
      UPDATE u WITH { profile: @profile } IN users
      RETURN NEW`;
    const params = { username, profile };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async exists(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const count = await cursor.next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  // authenticate user provided username password combination
  static async authenticate(username, password) {
    // get information about the user from a database
    const query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          username: u.username,
          password: u.password,
          email: u.email,
          profile: u.profile
        }`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    // default not authenticated values
    let credentialsMatch = false,
        isVerified = false,
        profile;

    // change default values when authenticated
    switch (output.length) {
      // when we found no user by the username, keep default values (not logged)
      case 0:
        break;
      // when a user was found
      case 1:
        // check whether the provided password matches the hashed password from db
        credentialsMatch = await account.compare(password, output[0].password);

        // user is verified when her email is present (otherwise only emailTemporary)
        isVerified = Boolean(output[0].email);

        // populate user's profile
        profile = _.pick(output[0].profile, ['givenName', 'familyName']);
        break;
      default:
        throw new Error('Database Error');
    }

    const user = {
      authenticated: credentialsMatch,
      verified: Boolean(isVerified && credentialsMatch)
    };

    if (credentialsMatch) {
      profile.username = username;
      _.assign(user, profile);
    }

    return user;
  }

  static async emailExists(email) {
    const query = `
      FOR u IN users FILTER u.email == @email
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { email: email };
    const count = await (await this.db.query(query, params)).next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  // check whether the email verification code is correct
  // if correct, update temporary email to email and resolve
  // if incorrect, reject the promise
  static async verifyEmail(username, code) {
    // read the temporary email data
    const query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          email: u.account.email.temporary,
          code: u.account.email.code,
          codeExpire: u.account.email.codeExpire
        }
    `;
    const params = { username };
    const output = await (await this.db.query(query, params)).all();

    if(output.length === 0) throw new Error('User Not Found');
    if(output.length > 1) throw new Error('Database Corruption');
    const info = output[0];
    const isAlreadyVerified = !(info.email && info.code && info.codeExpire);
    if (isAlreadyVerified) throw new Error('User is already verified');

    // check the codes, time limit
    const isCodeExpired = Date.now() > info.codeExpire;
    if (isCodeExpired) throw new Error('Code Is Expired');

    const codeMatches = await account.compare(code, info.code);

    if (codeMatches !== true) throw new Error('Code Is Not Correct');
    // if correct, put emailTemporary to email and erase all the rest
    // update the database: move emailTemporary to email and clean the data
    await this.finalVerifyEmail(username);
  }

  // finish email verification. move emailTemporary to email and clean
  static async finalVerifyEmail(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        UPDATE {
          _key: u._key,
          email: u.account.email.temporary,
          account: MERGE(u.account, { email: null })
        }
        IN users
    `;
    const params = { username };
    await this.db.query(query, params);
  }

  static async readTags(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          LET ut = KEEP(e, 'story', 'relevance')
          LET us = MERGE(KEEP(u, 'username'), u.profile)
          LET tg = KEEP(v, 'tagname', 'description', 'created')
          SORT ut.relevance DESC, tg.tagname ASC
          RETURN MERGE(ut, { user: us }, { tag: tg })`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output;
  }

  // TODO optionally filter out unverified users
  static async readUsersByTags(tagnames) {
    const query = `
      // find users by tags
      //
      // find the tags
      FOR t IN tags FILTER t.tagname IN @tagnames
        // find users linked to tags by userTag
        // (User)-[UserTag]->(Tag)
        FOR u,ut IN 1 ANY t
          INBOUND userTag
          // sort tags by relevance for the user
          SORT ut.relevance DESC
          // put similar users together
          COLLECT user=u INTO asdf KEEP t, ut
          // sort the users by the sum of relevances of found tags
          LET relevanceSum = SUM(asdf[*].ut.relevance)
          SORT relevanceSum DESC
          RETURN { user, relevanceSum, tags: asdf[*].t, userTags: asdf[*].ut }
    `;
    const params = { tagnames };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    return output;
  }

  /**
   * Find users related by common tags to @username
   * @param {string} username
   * @returns {Promise<Objec>}
   *
   */
  static async readUsersByMyTags(username) {
    const query = `
      FOR u IN users FILTER u.username==@username
        FOR v,e,p IN 2 OUTBOUND u
          ANY userTag
          LET relevanceWeight=SQRT(p.edges[0].relevance*p.edges[1].relevance)
          LET tag=p.vertices[1]
          LET utag=e
          LET finalUser=v
          SORT relevanceWeight DESC
          COLLECT user=finalUser INTO asdf KEEP relevanceWeight, tag, utag
          LET weightSum = SUM(asdf[*].relevanceWeight)
          SORT weightSum DESC
          RETURN { user, relevance: weightSum, tags: asdf[*].tag, userTags: asdf[*].utag }
    `;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    return output;
  }
}

module.exports = User;
