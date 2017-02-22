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
var multer  =   require('multer');
var path = require('path');
var Gallery = mongoose.model('Gallery');
var mkdirp = require('mkdirp');
var sharp = require('sharp');
var csrf = require('csurf');

module.exports = function (app) {
  app.use('/', router);
};

/**
 * Make sure the current user is logged in.
 */
var redirectIfNotLoggedIn = function (req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  }
  else {
    next()
  }
}
// Add cookie CSRF protection
var csrfProtection = csrf({ cookie: true});
// Load categories
var loadTags = function (req, res, next) {
  Gallery.find().distinct('tags', function(error, tags) {
    req.galleryTags = tags;
    next();
  });
}
// Load Venues
var loadVenues = function (req, res, next) {
  Gallery.find().distinct('venues', function(error, tags) {
    req.galleryVenues = tags;
    next();
  });
}
/**
 * Resize the image to a thumbnail and store it under thumbnails.
 */
var thumbnailerizer = function (req, res, next) {
  var path = req.params.p1 + (req.params.p2 ? '/' + req.params.p2 : '');
  var dir = req.params.p2 ?  req.params.p1 : '' ;
  var s = sharp('./public/uploads/' + path);
  var resize = function() {
    return s.resize(100)
     .toFile('./public/thumbnails/'+ path, (err, info) => {
        if (err) {
          next(err);
        }
        // Redirect to grab new image.
        // @todo likely can make this more effeiciant via grabbing buffer
        res.redirect('/thumbnails/' + path);
    });
  }
  if (dir) {
    mkdirp('./public/thumbnails/'+ dir, err => {
      if (err) {
        return next(err)
      }
      return resize();
    });
  }
  else {
    return resize();
  }
}
// @todo Should be a way to specificy p2 as optional and have 1 root, ? didn't work.
router.get('/thumbnails/:p1', thumbnailerizer);
router.get('/thumbnails/:p1/:p2', thumbnailerizer);

/**
 * View all galleries.
 */
router.get('/galleries', redirectIfNotLoggedIn, function (req, res, next) {
  var limit = 50;
  var find = {};
  if (req.query.after > 0) {
    find.date = {$lt: req.query.after};
  }
  var search = '';
  if (req.query.search && req.query.search.length) {
    search = req.query.search;
    // @todo Security? Though only trusted users use this functionality
    // may want to remove some characters. "i" flag is not performant.
    find.title = { $regex: new RegExp(req.query.search, "i") };
  }
  Gallery
    .find(find)
    .limit(limit)
     .sort({ date: -1}).exec(function (err, galleries) {
    if (err) return next(err);
    res.render('galleries/galleries', {
      title: 'Galleries',
      galleries: galleries,
      after: galleries.length > 0 ?  galleries[galleries.length -1].date.valueOf() : 0,
      current:  req.query.after ? req.query.after : 0,
      showNext: galleries.length == limit,
      search: search,
    });
  });
});

/**
 * Construct the path.
 *
 * Images are currently stored in public.
 * @todo Need to figure out how that'd work for production and adjust
 * so both dev and production work.
 */
function imgPath(path) {
  return path ? path.substr(path.indexOf('/')) : '';
}

/**
 * Create Gallery form
 */
router.get('/galleries/create', redirectIfNotLoggedIn, csrfProtection, loadTags, loadVenues, function (req, res, next) {
  res.render('galleries/create',  {
    title: 'Create Gallery',
    csrfToken: req.csrfToken(),
    venues: req.galleryVenues,
    tags: req.galleryTags,
    gallery: {tags: [], venues: []}
  });
});

/**
 * Create a stub via replacing everything non alphanumeric
 */
var createStub = function(name) {
  name = name.toLowerCase();
  name = name.replace(' ', '-');
  return name.replace(/\W/g, '');
}

// Create a custom storage handler.
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    // If using galleryname, return the new uploads.
    var galleryId = req.params.gallerId ? req.params.gallerId : req.body.galleryid;
    if (req.body.galleryname) {
      var dir = './public/uploads/' + createStub(req.body.galleryname) + '/';
      mkdirp(dir, err => callback(err, dir));
    }
    // Use current stub if gallery id provided.
    else if (galleryId) {
      Gallery.findById(galleryId, function (err, gallery) {
        if (err) {
          req.flash('error', 'Unable to find gallery to add photos to.');
          router.redirect('/galleries/create');
          return;
        }
        var dir = './public/uploads/' + gallery.stub + '/';
        callback(null, dir);
      });
    }
    // @todo Error out.
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  }
});

// Wrapper for gallery save.
var gallerySave = function(gallery, req, res, next, create) {
  processGalleryTags(gallery, 'tags', 'Tags', req);
  processGalleryTags(gallery, 'venues', 'Venues', req);
  gallery.save(function (err) {
    if (err) {
      req.flash('error', create ? 'Gallery Creation Failed' : 'Gallery Update Failed');
      next(err);
    }
    else {
      req.flash('success', create ? 'Gallery Creation Successful' : 'Gallery Update Successful');
      res.redirect('/galleries/' + gallery._id);
    }
  });
}

var multerHandler = multer({ storage : storage }).array('galleryPhotos');

function processGalleryTags(gallery, key, keyUpper, req) {
  gallery[key] = [];
	if (req.body['gallery' + keyUpper +  'Free']) {
  	gallery[key] = gallery[key].concat(req.body['gallery' + keyUpper +  'Free'].split(','));
	}
	if (req.body['gallery' + keyUpper]) {
  	gallery[key] = gallery[key].concat(req.body['gallery' + keyUpper]);
	}
	// Make distinct
	gallery[key] = Array.from(new Set(gallery[key]));
	// Trim off any trailing whitespace.
	gallery[key] = gallery[key].map(function(s) { return s.trim()});
}

/**
 * Handling gallery creation.
 */
router.post('/galleries/create', redirectIfNotLoggedIn, multerHandler, csrfProtection, function(req, res, next){
  if (!req.user) {
	  req.flash('info', 'Please Login to access this area.');
    res.redirect('/login');
    return;
  }
	if (req.body.galleryname && req.files.length > 0) {
  	var images = [];
  	for (var key in req.files) {
    	if (req.files[key].mimetype.indexOf('image/') === 0) {
      	images.push({src: req.files[key].path});
    	}
    	else {
      	// @todo delete file?
        req.flash('error', 'Image of improver format uploaded ' + req.files[key].mimetype);
    	}
  	}
  	var create = req.body.galleryname ? true : false;
  	var gallery = new Gallery({
    	title: req.body.galleryname,
    	stub: createStub(req.body.galleryname),
    	external: false,
    	images: images,
  	});
  	gallerySave(gallery, req, res, next, true);
  }
  else {
    req.flash('error', 'Please provide gallery and images.');
    res.redirect('/galleries/create');
  }
});

router.get('/galleries/:gallerId', redirectIfNotLoggedIn, function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err || !gallery) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    res.render('galleries/gallery', {
      title: gallery.title,
      gallery: gallery,
      images: gallery.pathedImages,
    });
  });
})



/**
 * Handling gallery editing.
 */
router.get('/galleries/:gallerId/edit', redirectIfNotLoggedIn, csrfProtection, loadTags, loadVenues, function (req, res, err) {
  Gallery.findById(req.params.gallerId).exec(function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var date = gallery.date.toISOString();
    res.render('galleries/edit', {
      title: 'Edit ' + (gallery.title ? gallery.title : 'Unnamed'),
      gallery: gallery,
      csrfToken: req.csrfToken(),
      venues: req.galleryVenues,
      tags: req.galleryTags,
      // todo Deal with timezones.
      date: date.substring(0, date.indexOf('T'))
    });
  });
});

/**
 * Handling gallery edit submission.
 */
router.post('/galleries/:gallerId/edit', redirectIfNotLoggedIn, multerHandler, csrfProtection, function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err || !gallery) {
      req.flash('error', 'Unable to find gallery to update.');
      res.redirect('/galleries');
      return;
    }
  	for (var key in req.files) {
    	if (req.files[key].mimetype.indexOf('image/') === 0) {
      	gallery.images.push({src: req.files[key].path});
    	}
    	else {
      	// @todo delete file?
        req.flash('error', 'Image of improver format uploaded ' + req.files[key].mimetype);
    	}
  	}
  	gallery.title = req.body.galleryTitle;
  	gallery.date = req.body.galleryDate;
    gallerySave(gallery, req, res, next, false);
  });
});

/**
 * Handling gallery editing.
 */
router.get('/galleries/:gallerId/delete', redirectIfNotLoggedIn, csrfProtection, function (req, res, err) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var date = gallery.date.toISOString();
    res.render('galleries/gallerydelete', {
      title: 'Are you sure you want to delete ' + (gallery.title ? gallery.title : 'Unnamed') + ' gallery?',
      gallery: gallery,
      csrfToken: req.csrfToken(),
      // todo Deal with timezones.
      date: date.substring(0, date.indexOf('T'))
    });
  });
});

/**
 * Handling image deletion.
 *
 * @todo Delete images files from galleries.
 */
router.post('/galleries/:gallerId/delete', redirectIfNotLoggedIn, csrfProtection, function (req, res, err) {
  Gallery.remove({'_id': req.params.gallerId}, function (err, gallery) {
    if (err) {
      req.flash('error', 'Error deleting gallery.');
      return next(err);
    }
    req.flash('succes', 'Deleted gallery.');
    res.redirect('/galleries');
  });
});



/**
 * Handling showing image deletion form.
 *
 * @todo Delete image file.
 */
router.get('/galleries/:gallerId/image/:imageId/delete', redirectIfNotLoggedIn, csrfProtection, function (req, res, err) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var image = gallery.images.id(req.params.imageId);
    if (!image) {
      req.flash('error', 'Unable to find image');
      return next(err);
    }
    res.render('galleries/galleryimagedelete', {
      title: 'Are you sure you want to delete image of gallery' + (gallery.title ? ' ' + gallery.title : '' ) + '? ',
      image: image,
      csrfToken: req.csrfToken(),
      gallery: gallery,
      src: imgPath(image.src),
    });
  });
});


/**
 * Handling image deletion.
 */
router.post('/galleries/:gallerId/image/:imageId/delete', redirectIfNotLoggedIn, csrfProtection, function (req, res, err) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var image = gallery.images.id(req.params.imageId);
    if (!image) {
      req.flash('error', 'Unable to find image');
      return next(err);
    }
    image.remove();
    gallery.save(function (err) {
      if (err) {
        req.flash('error', 'Unable to delete image from gallery.');
        return next(err);
      }
      req.flash('succes', 'Deleted image from gallery.');
      res.redirect('/galleries/' + req.params.gallerId);
    });
  });
});
