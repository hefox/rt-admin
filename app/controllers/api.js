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

var allowCors = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
};

/**
 * View all galleries.
 */
router.get('/api/galleries', allowCors, function (req, res, next) {
  var ret = {};
  var query = Gallery.find({$or: [{'images.src': {$exists:true}}, {external: true}] })
    .sort({ date: -1, title: 1 });
  // Filter by year.
  if (req.query.year) {
    ret.year = parseInt(req.query.year);
    query.where('date').gt(new Date(ret.year, 1, 1)).lt(new Date(ret.year+1, 1, 1));
  }
  else {
    /* @todo Need to figure out how this would work
      with the search being on the client */
    query.limit(400);
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
        title: galleries[g].title,
        id: galleries[g]._id,
        stub: galleries[g].stub,
        date: galleries[g].date.toString(),
        firstImage: galleries[g].firstImage,
      });
    }
    res.json(ret);
  });
});

// Handle gallery return
function returnGallery(err, gallery, req, res, next) {
  if (err || !gallery) {
    req.flash('error', 'Gallery not found.');
    return next(err);
  }
  gallery.images2 = gallery.pathedImages;
  res.json({
    title: gallery.title,
    id: gallery._id,
    stub: gallery.stub,
    date: gallery.date.toString(),
    images: gallery.pathedImages,
  });
}
/**
 * View all galleries.
 */
router.get('/api/galleries/:gallerId', allowCors, function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    return returnGallery(gallery, err, req, res, next);
  });
})

/**
 * View all galleries.
 */
router.get('/api/galleries/stub/:stub', allowCors, function (req, res, next) {
  Gallery.find({'stub': req.params.stub}, function (err, gallery) {
    return returnGallery(err, gallery.length ? gallery[0] : null, req, res, next);
  });
})

