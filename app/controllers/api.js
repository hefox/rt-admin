/**
 * Define the api.
 *
 * api/galleries: return galleries
 * api/galleries/:galleryID : return a gallery
 */

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Gallery = mongoose.model('Gallery');

module.exports = function (app) {
  app.use('/', router);
};

/**
 * View all galleries.
 */
router.get('/api/galleries', function (req, res, next) {
  var ret = {};
  var query = Gallery.find({$or: [{'images.src': {$exists:true}}, {external: true}] })
    .sort({ date: -1, title: 1 });
  // Filter by year.
  if (req.query.year) {
    ret.year = parseInt(req.query.year);
    query.where('date').gt(new Date(ret.year, 1, 1)).lt(new Date(ret.year+1, 1, 1));
  }
  else {
    query.limit(10);
    if (req.query.skip) {
      query.skip(parseInt(req.query.skip));
    }
  }
  // Return the galleries.
  query.exec(function (err, galleries) {
    if (err) return next(err);
    ret.galleries = [];
    for (var g = 0; g < galleries.length; g++) {
      ret.galleries.push({
        name: galleries[g].name,
        id: galleries[g]._id,
        stub: galleries[g].stub,
        firstImage: galleries[g].firstImage,
      });
    }
    res.json(ret);
  });
});

/**
 * View all galleries.
 */
router.get('/api/galleries/:gallerId', function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err || !gallery) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    console.log('wat',  gallery.pathedImages);
    gallery.images2 = gallery.pathedImages;
    res.json({
      title: gallery.title,
      id: gallery._id,
      stub: gallery.stub,
      images: gallery.pathedImages,
    });
  });
})
