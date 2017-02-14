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

/**
 * View all galleries.
 */
router.get('/galleries', redirectIfNotLoggedIn, function (req, res, next) {
  Gallery.find(function (err, galleries) {
    if (err) return next(err);
    res.render('galleries/galleries', {
      title: 'Galleries',
      galleries: galleries,
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
router.get('/galleries/create', redirectIfNotLoggedIn, function (req, res, next) {
  res.render('galleries/gallerycreate',  {
    title: 'Create Gallery',
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
    console.log('got to upload', galleryId);
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

/**
 * Handling gallery creation.
 */
router.post('/galleries/create', redirectIfNotLoggedIn, multerHandler, function(req, res, next){
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
    var images = [];
    // @todo how to propery traverse this array.
    for (var i = 0; i < gallery.images.length; i++) {
      if (gallery.images.hasOwnProperty(i)) {
        images.push({src: imgPath(gallery.images[i].src), _id: gallery.images[i]._id})
      }
    }
    res.render('galleries/gallery', {
      title: gallery.title,
      gallery: gallery,
      images: images,
    });
  });
})

/**
 * Handling gallery editing.
 */
router.get('/galleries/:gallerId/edit', redirectIfNotLoggedIn, function (req, res, err) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var date = gallery.date.toISOString();
    res.render('galleries/galleryedit', {
      title: 'Edit ' + (gallery.title ? gallery.title : 'Unnamed'),
      gallery: gallery,
      // todo Deal with timezones.
      date: date.substring(0, date.indexOf('T'))
    });
  });
});

/**
 * Handling gallery edit submission.
 */
router.post('/galleries/:gallerId/edit', redirectIfNotLoggedIn, multerHandler, function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
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
});

/**
 * Handling showing image deletion form.
 */
router.get('/galleries/:gallerId/image/:imageId/delete', redirectIfNotLoggedIn, function (req, res, err) {
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
      gallery: gallery,
      src: imgPath(image.src),
    });
  });
});


/**
 * Handling image deletion.
 */
router.post('/galleries/:gallerId/image/:imageId/delete', redirectIfNotLoggedIn, function (req, res, err) {
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
