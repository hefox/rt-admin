var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Gallery = mongoose.model('Gallery');

module.exports = function (app) {
  app.use('/', router);
};

router.get('/galleries', function (req, res, next) {
  Gallery.find(function (err, galleries) {
    if (err) return next(err);
    res.render('index', {
      user : req.user,
      title: 'Photo Uploader yay',
      galleries: galleries,
      info: req.flash('info'),
      error: req.flash('error'),
    });
  });
});
