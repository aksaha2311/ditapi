const _ = require('lodash'),
      path = require('path'),
      jwt = require('jsonwebtoken');

const config = require(path.resolve('./config'));

// this middleware shouldn't be applied on some url paths
// i.e. when using Basic Authorization for login with credentials
const pathBlacklist = ['/auth/token', '/auth/token/'];

async function setAuthData(req, res, next) {
  if (pathBlacklist.includes(req.path)) {
    return next();
  }

  // set the default req.auth (not logged)
  req.auth = { logged: false, loggedUnverified: false, username: null };

  if (_.has(req, 'headers.authorization')) {
    const token = req.headers.authorization;
    let username, verified;
    try {
      const data = await tokenGetData(token);
      username = data.username;
      verified = data.verified;
    } catch (e) {

      const error = {
        status: '403',
        title: 'Not Authorized'
      };

      // add error detail
      switch (e.name) {
        case 'TokenExpiredError': {
          error.detail = 'expired';
          break;
        }
      }
      return res.status(403).json({ errors: [error] });
    }

    req.auth.username = username;
    req.auth.logged = (verified === true) ? true : false;
    req.auth.loggedUnverified = (verified === false) ? true : false;
  }

  next();
}

async function tokenGetData(token){
  // cutting away 'Bearer ' part of token
  token = token.split(' ').pop();
  return await jwt.verify(token, config.jwt.secret);
}

module.exports = setAuthData;
