var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Gallery = mongoose.model('Gallery');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {
  // Redirect to images for now.
  if (req.user) {
    res.redirect('/galleries');
    return;
  }
  res.redirect('/login');
});
