var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy;

module.exports = function (app) {
  app.use('/', router);
};

router.get('/login', function (req, res, next) {
  res.render('login',  { user : req.user, error: req.flash('error') });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
  successFlash: 'Welcome!'
}));

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});