var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var multer  =   require('multer');
var path = require('path');
var Gallery = mongoose.model('Gallery');
var mkdirp = require('mkdirp');

var handleError = function(err) {
  router.redirect('/images');
}

module.exports = function (app) {
  app.use('/', router);
};

router.get('/images', function (req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  }
  else {
    Gallery.find({title: { $ne: null }}).select('title stub').exec(function (err, galleries) {
      res.render('imagesform',  {
        title: 'Upload Gallery',
        galleries: galleries
      });
    });
  }
});

// Create a stub via replacing everything non alphanumeric
var createStub = function(name) {
  name = name.toLowerCase();
  name = name.replace(' ', '-');
  return name.replace(/\W/g, '');
}

// Create a custom storage handler.
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    if (req.body.galleryname) {
      var dir = './public/uploads/' + createStub(req.body.galleryname) + '/';
      mkdirp(dir, err => callback(err, dir));
    }
    else if (req.body.galleryid) {
      Gallery.findById(req.body.galleryid, function (err, gallery) {
        if (err) return handleError(err);
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

router.post('/images', multer({ storage : storage }).array('galleryPhotos'), function(req, res){
  if (!req.user) {
	  req.flash('info', 'Please Login to access this area.');
    res.redirect('/login');
    return;
  }
	if ((req.body.galleryname || req.body.galleryid) && req.files.length > 0) {
  	var images = [];
  	for (var key in req.files) {
    	if (req.files[key].mimetype.indexOf('image/') === 0) {
      	images.push({src: req.files[key].path});
    	}
  	}
  	var create = req.body.galleryname ? true : false;
  	var save = function(gallery) {
      gallery.save(function (err) {
        if (err) {
          req.flash('error', create ? 'Gallery Creation Failed' : 'Gallery Update Failed');
          return handleError(err);
        }
        else {
          req.flash('success', create ? 'Gallery Creation Successful' : 'Gallery Update Successful');
          res.redirect('/galleries');
        }
      });
  	}
  	if (req.body.galleryname) {
    	var gallery = new Gallery({
      	title: req.body.galleryname,
      	stub: createStub(req.body.galleryname),
      	external: false,
      	images: images,
    	});
    	save(gallery);
  	}
  	else {
      Gallery.findById(req.body.galleryid, function (err, gallery) {
        if (err) {
          req.flash('error', 'Unable to find gallery to update.');
          res.redirect('/images');
          return;
        }
        for (var i in images) {
          gallery.images.push(images[i])
          console.log(images[i]);
        }
        save(gallery);
      });
  	}
  }
  else {
    req.flash('error', 'Please provide gallery and images.');
    res.redirect('/images');
  }
});
