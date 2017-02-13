var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var multer  =   require('multer');
var path = require('path');
var Gallery = mongoose.model('Gallery');
var Image = mongoose.model('Image');
var mkdirp = require('mkdirp');



module.exports = function (app) {
  app.use('/', router);
};

router.get('/images', function (req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  }
  else {
    res.render('imagesform',  {
      user : req.user,
      info: req.flash('info')
    });
  }
});

// Create a stub via replacing everything non alphanumeric
var createStub = function(name) {
  name = name.toLowerCase();
  return name.replace(' ', '-').replace(/\W/g, '');
}

// Create a custom storage handler.
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    var dir = './public/uploads/' + createStub(req.body.galleryname) + '/';
    mkdirp(dir, err => callback(err, dir))
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
	if (req.body.galleryname && req.files) {
  	var images = [];
  	for (var key in req.files) {
    	if (req.files[key].mimetype.indexOf('image/') === 0) {
      	images.push(new Image({src: req.files[key].path}));
    	}
  	}
  	var gallery = new Gallery({
    	name: req.body.galleryname,
    	stub: createStub(req.body.galleryname),
    	external: false,
    	images: images,
  	});
    gallery.save(function (err) {
      if (err) {
        req.flash('error', 'Gallery Creation Failed');
        return handleError(err);
      }
      else {
        req.flash('info', 'Gallery Creation Successful');
        res.redirect('/galleries');
      }
    });
  }
  else {
    req.flash('error', 'Please provide gallery name and images.');
  }
});
