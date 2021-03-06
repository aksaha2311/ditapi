'use strict';

const // httpMocks = require('node-mocks-http'),
      jwt = require('jsonwebtoken'),
      _ = require('lodash'),
      path = require('path'),
      rewire = require('rewire'),
      should = require('should'),
      sinon = require('sinon');

// const models = require(path.resolve('./models'));
// const authController = require(path.resolve('./controllers/authenticate-token'));
const authenticateController = rewire(path.resolve('./controllers/authenticate'));
const jwtConfig = require(path.resolve('./config')).jwt;
// const authenticateControllerPublic = require(path.resolve('./controllers/authenticate'));
// const authorizeController = require(path.resolve('./controllers/authorize'));


describe('token authorization', function() {
  let sandbox;

  const user = {
    username: 'user',
    verified: true,
    givenName: 'userGivenName',
    familyName: 'userFamilyName',
    password: 'userPass'
  };

  const unverifiedUser = {
    username: 'userUnveryfied',
    verified: false,
    givenName: 'userUnverifiedGivenName',
    familyName: 'userUnverifiedFamilyName',
    password: 'userUnverifiedPassword'
  };

  const payloadFields = ['username', 'verified', 'givenName', 'familyName'];

  const userToken = jwt.sign(_.pick(user, payloadFields), jwtConfig.secret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });

  const unverifiedUserToken = jwt.sign(_.pick(unverifiedUser, payloadFields), jwtConfig.secret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });

  // const otherUser = { username: 'otherUser'};
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('tokenGetData(token)', function() {
    const tokenGetData = authenticateController.__get__('tokenGetData');
    describe('correct token', function() {
      describe('verified user', function(){
        it('should check data have property username', async function(){
          const check = await tokenGetData(userToken);
          should(check).have.property('username');
        });
        it('should return correct username', async function(){
          const check = await tokenGetData(userToken);
          should(check.username).equal(user.username);
        });
        it('should call token.verify once', async function(){
          const stubToken = sandbox.stub(jwt, 'verify');
          await tokenGetData(userToken);
          should(stubToken.callCount).equal(1);
        });
        it('should return verified parameter', async function(){
          const check = await tokenGetData(userToken);
          should(check).have.property('verified');
        });
        it('should return verified true', async function(){
          const check = await tokenGetData(userToken);
          should(check.verified).equal(true);
        });
        it('should return givenName parameter', async function(){
          const check = await tokenGetData(userToken);
          should(check).have.property('givenName');
        });
        it('should return correct givenName parameter', async function(){
          const check = await tokenGetData(userToken);
          should(check.givenName).equal(user.givenName);
        });
        it('should return familyName parameter', async function(){
          const check = await tokenGetData(userToken);
          should(check).have.property('familyName');
        });
        it('should return correct familyName parameter', async function(){
          const check = await tokenGetData(userToken);
          should(check.familyName).equal(user.familyName);
        });
      });
      describe('unverified user', function(){
        it('should check data have property username', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check).have.property('username');
        });
        it('should check return correct username', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check.username).equal(unverifiedUser.username);
        });
        it('should call token.verify once', async function(){
          const stubToken = sandbox.stub(jwt, 'verify');
          await tokenGetData(unverifiedUserToken);
          should(stubToken.callCount).equal(1);
        });
        it('should return verified parameter', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check).have.property('verified');
        });
        it('should return verified false', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check.verified).equal(false);
        });
        it('should return givenName parameter', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check).have.property('givenName');
        });
        it('should return correct givenName parameter', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check.givenName).equal(unverifiedUser.givenName);
        });
        it('should return familyName parameter', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check).have.property('familyName');
        });
        it('should return correct familyName parameter', async function(){
          const check = await tokenGetData(unverifiedUserToken);
          should(check.familyName).equal(unverifiedUser.familyName);
        });
      });
    });
    describe('incorrect token', function(){
      it('should Promise be rejected', async function(){
        try {
          await tokenGetData(userToken+'x');
          // the code beyond should not be executed because of expected error
          throw new Error('should not be reached');
        } catch (e) {
          should(e.message).eql('invalid signature');
        }
      });
      it('should call token.verify once', async function(){
        const stubToken = sandbox.stub(jwt, 'verify');
        await tokenGetData(userToken+'x');
        should(stubToken.callCount).equal(1);
      });
    });
  });
  /*
  describe('onlyLogged(req, res, next)', function(){
    // const tokenGetData = authorizeController.__get__('tokenGetData');
    describe('sending request with correct authorization header verified user', function(){
      let req, res, unset, tokenStub;
      beforeEach(function () {
        // mocking request
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: user.username, verified: user.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should set req.auth.logged = true', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).have.property('logged');
        should(req.auth.logged).equal(true);
      });
      it('should set req.auth to have {username: \'username\'', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req.auth).have.property('username');
        should(req.auth.username).equal(user.username);
      });
      it('should set auth.loggedUnverified = false', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req.auth).have.property('loggedUnverified');
        should(req.auth.loggedUnverified).equal(false);
      });
    });
    describe('sending request with incorrect authorization header', function(){
      let req, res, tokenStub, unset;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLogged(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should call token.getData() once', async function() {
        // passing empty res and next() returning true
        await authorizeController.onlyLogged(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should req.auth be empty', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending request without authorization header', function(){
      let req, res, tokenStub, unset;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLogged(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call token.getData()', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(tokenStub.callCount).equal(0);
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should req.auth be empty', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending request with correct authorization header for unverified user', function(){
      let req, res, tokenStub, unset;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + unverifiedUserToken}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {logged: false, username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should call token.getData() once', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should set req.logged = false', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req.auth).have.property('logged');
        should(req.auth.logged).equal(false);
      });

      //
      it('should set req.auth to have {username: \'username\'', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req.auth).have.property('username');
        should(req.auth.username).equal(unverifiedUser.username);
      });
      it('should set auth.loggedUnverified = true', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req.auth).have.property('loggedUnverified');
        should(req.auth.loggedUnverified).equal(true);
      });
    });
    describe('tokenGetData returns object without \'verified\' field', function(){
      let req, res, tokenStub, unset;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + unverifiedUserToken}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username }}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should set req.auth to be empty', async function() {
        await authorizeController.onlyLogged(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).is.empty();
      });
    });
  });
  describe('onlyLoggedMe(req, res, next)', function(){
    describe('sending request with correct authorization header as Me', function(){
      // const tokenGetData = authorizeController.__get__('tokenGetData');
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}, params:{username: user.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: user.username, verified: user.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should set req.logged = true', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).have.property('logged');
        should(req.auth.logged).equal(true);
      });
      it('should set req.auth to have {username: \'username\'', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).have.property('username');
        should(req.auth.username).equal(user.username);
      });
      it('should set auth.loggedUnverified = false', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).have.property('loggedUnverified');
        should(req.auth.loggedUnverified).equal(false);
      });
    });
    describe('sending request with correct authorization header not as Me', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}, params:{username: otherUser.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: user.username, verified: user.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should call token.getData() once', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should set req.auth to be empty', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).is.empty();
      });
    });
    describe('sending request with correct authorization header as Me unverified', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + unverifiedUserToken}, params:{username: unverifiedUser.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should set req have property auth', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
      });
      it('should set req have property auth.logged false', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req.auth).have.property('logged');
        should(req.auth.logged).equal(false);
      });
    });
    describe('sending request with incorrect authorization header', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}, params:{username: user.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should call token.getData() once', async function() {
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should set req.logged = false', async function() {
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('logged');
        should(req.logged).equal(false);
      });
      it('should set req.auth to be empty', async function() {
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending request without authorization header', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call token.getData()', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(0);
      });
      it('should not call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should set req.logged = false', async function() {
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('logged');
        should(req.logged).equal(false);
      });
      it('should set req.auth to be empty', async function() {
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending request without params.username', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call next', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
      it('should set req.logged = false', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('logged');
        should(req.logged).equal(false);
      });
      it('should set req.auth to be empty', async function() {
        // spying on next(); by sending spy of next to middleware
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending corect request and not getting data.username from token', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should return res with 403 status', async function() {
        // set stubing by function returning valid:true and no data
        await authorizeController.onlyLoggedMe(req,res,()=>{});
        should(res.statusCode).equal(403);
      });
      it('should set req.logged = false', async function() {
        // set stubing by function returning valid:true and no data
        await authorizeController.onlyLoggedMe(req,res,()=>{});
        should(req).have.property('logged');
        should(req.logged).equal(false);
      });
      it('should set req.auth to be empty', async function() {
        // set stubing by function returning valid:true and no data
        await authorizeController.onlyLoggedMe(req,res,()=>{});
        should(req).have.property('auth');
        should(req.auth).be.empty();
      });
    });
    describe('sending request with correct authorization header for unverified user', function(){
      let req, res, unset, tokenStub;
      beforeEach(function() {
        req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + unverifiedUserToken}, params:{username: unverifiedUser.username}});
        res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        tokenStub = sandbox.stub().callsFake(()=>({valid:true, data: {username: unverifiedUser.username, verified: unverifiedUser.verified}}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
      });
      afterEach(function() {
        // rewerts change
        unset();
      });
      it('should call next()', async function() {
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
      });
      it('should req have property auth', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req).have.property('auth');
      });
      it('should req have property auth.logged = false', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req.auth).have.property('logged');
        should(req.auth.logged).equal(false);
      });
      it('should req have property auth.username with a correct username', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req.auth).have.property('username');
        should(req.auth.username).equal(unverifiedUser.username);
      });
      it('should req have property auth.loggedUnverified = true', async function() {
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(req.auth).have.property('loggedUnverified');
        should(req.auth.loggedUnverified).equal(true);
      });
    });
  });
  */
});
