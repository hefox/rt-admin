var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var multer  =   require('multer');
var path = require('path');
var Gallery = mongoose.model('Gallery');
var mkdirp = require('mkdirp');

var handleError = function(err) {
  router.redirect('/galleries/create');
}

module.exports = function (app) {
  app.use('/', router);
};

var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Gallery = mongoose.model('Gallery');

module.exports = function (app) {
  app.use('/', router);
};

var redirectIfNotLoggedIn = function (req, res, next) {
  if (!req.user) {
    console.log('log logged in');
    res.redirect('/login');
  }
  else {
    next()
  }
}

router.get('/galleries', redirectIfNotLoggedIn, function (req, res, next) {
  Gallery.find(function (err, galleries) {
    if (err) return next(err);
    res.render('galleries', {
      title: 'Galleries',
      galleries: galleries,
    });
  });
});

function imgPath(path) {
  return path ? path.substr(path.indexOf('/')) : '';
}

router.get('/galleries/create', redirectIfNotLoggedIn, function (req, res, next) {
  Gallery.find({title: { $ne: null }}).select('title stub').exec(function (err, galleries) {
    res.render('imagesform',  {
      title: 'Upload Gallery',
      galleries: galleries
    });
  });
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

router.post('/galleries/create', redirectIfNotLoggedIn, multer({ storage : storage }).array('galleryPhotos'), function(req, res){
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
          res.redirect('/galleries/create');
          return;
        }
        for (var i in images) {
          gallery.images.push(images[i])
        }
        save(gallery);
      });
  	}
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
    for (var i = 0; i < gallery.images.length; i++) {
      if (gallery.images.hasOwnProperty(i)) {
        images.push({src: imgPath(gallery.images[i].src), _id: gallery.images[i]._id})
      }
    }
    res.render('gallery', {
      title: gallery.title,
      gallery: gallery,
      images: images,
    });
  });
})

router.get('/galleries/:gallerId/edit', redirectIfNotLoggedIn, function (req, res, err) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    var date = gallery.date.toISOString();
    res.render('galleryedit', {
      title: 'Edit ' + (gallery.title ? gallery.title : 'Unnamed'),
      gallery: gallery,
      // todo Deal with timezones.
      date: date.substring(0, date.indexOf('T'))
    });
  });
})
router.post('/galleries/:gallerId/edit', redirectIfNotLoggedIn, function (req, res, next) {
  Gallery.findById(req.params.gallerId, function (err, gallery) {
    if (err) {
      req.flash('error', 'Gallery not found.');
      return next(err);
    }
    Gallery.update({ _id: req.params.gallerId }, {
      title: req.body.galleryTitle,
      date: req.body.galleryDate,
      }, { multi: false }, function(err) {
      if(err) {
        req.flash('error', 'Unable to update gallery');
        return next(err);
      }
      req.flash('success', 'Updated gallery');
      res.redirect('/galleries/' + req.params.gallerId);
    });
  });
});