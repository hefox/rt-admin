/**
 * Define the galleries functionality.
 *
 * galleries/create: Create a new gallery
 * galleries: View galleries
 * galleries/:_id: View gallery
 * galleries/:_id/edit: Edit gallery
 */

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var path = require('path');
var User = mongoose.model('User');
var csrf = require('csurf');

module.exports = function (app) {
  app.use('/users/', router);
};

/**
 * Make sure the current user is logged in.
 */
var redirectIfNotLoggedInAdmin = function (req, res, next) {
  if (!req.user || !req.user.admin) {
    req.flash('error', 'Only administers can access this area.');
    res.redirect('/');
  }
  // @todo test role
  else {
    next()
  }
}
// Add cookie CSRF protection
var csrfProtection = csrf({ cookie: true});

/**
 * Create Gallery form
 */
router.get('/', redirectIfNotLoggedInAdmin, function (req, res, next) {
  User.find(function (err, accounts) {
    res.render('users/list',  {
      title: 'Users',
      accounts: accounts
    });
  });
});

/**
 * Create user form
 */
router.get('/create', redirectIfNotLoggedInAdmin, csrfProtection, function (req, res, next) {
  res.render('users/form',  {
    title: 'Add User',
    csrfToken: req.csrfToken(),
    account: {},
    path: '/users/create',
  });
});


/**
 * Handling user creation.
 */
router.post('/create', redirectIfNotLoggedInAdmin, csrfProtection, function(req, res, next) {
	if (req.body.username && req.body.password) {
    var newUser = new User({
      username: req.body.username,
      admin: req.body.admin ? true : false
    });
    User.register(newUser,  req.body.password, function() {
      req.flash('success', 'User created.');
      res.redirect('/users');
    });
  }
  else {
    req.flash('error', 'Please provide username and password.');
    res.redirect('/users/create');
  }
});

/**
 * Edit user form
 */
router.get('/:userId/edit', redirectIfNotLoggedInAdmin, csrfProtection, function (req, res, next) {
  User.findById(req.params.userId, function (err, account) {
    if (!account || err) {
      return next(err);
    }
    res.render('users/form',  {
      title: 'Edit User',
      csrfToken: req.csrfToken(),
      account: account,
      path: '/users/' + req.params.userId + '/edit',
    });
  });
});

/**
 * Handling gallery creation.
 */
router.post('/:userId/edit', redirectIfNotLoggedInAdmin, csrfProtection, function(req, res, next) {
  User.findById(req.params.userId, function (err, account) {
    if (req.body.username) {
      account.username = req.body.username;
    }
    account.admin = req.body.admin ? true : false;
    var saveUser = function() {
      account.save();
      req.flash('success', 'User saved.');
      res.redirect('/users');
    }
    if (req.body.password) {
      account.setPassword(req.body.password, saveUser)
    }
    else {
      saveUser();
    }
  });
});

/**
 * Delete user form
 */
router.get('/:userId/delete', redirectIfNotLoggedInAdmin, csrfProtection, function (req, res, next) {
  if (req.user._id === req.params.userId) {
    req.flash('error', 'Cannot delete yourself!');
    res.redirect('/users');
    return;
  }
  User.findById(req.params.userId, function (err, account) {
    if (!account || err) {
      return next(err);
    }
    res.render('users/delete',  {
      title: 'Are you sure you want to delete user: ' + account.username + '?',
      csrfToken: req.csrfToken(),
      account: account
    });
  });
});

/**
 * Delete user submit.
 */
router.post('/:userId/delete', redirectIfNotLoggedInAdmin, csrfProtection, function (req, res, next) {
  User.remove({'_id': req.params.userId}, function (err, account) {
    if (err) {
      req.flash('error', 'Error deleting user.');
      return next(err);
    }
    req.flash('succes', 'Deleted user.');
    res.redirect('/users');
  });
});


