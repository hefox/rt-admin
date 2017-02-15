var seeder = require('mongoose-seed');
var albums = require('./albums.json');
var config = require('./../config/config');
var cookieParser = require('cookie-parser');
var passport = require('passport'),
  mongoose = require('mongoose'),
  LocalStrategy = require('passport-local').Strategy;

// Connect to MongoDB via Mongoose
seeder.connect('mongodb://localhost/rtadmin-test', function() {
  cookieParser(config.secret)
  require('express-session')({
    // @ todo set this in a secret outside of git
      secret: config.secret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 60000 }
  });
  passport.initialize();
  passport.session();
  // Load Mongoose models
  seeder.loadModels([
    './../app/models/gallery.js',
    './../app/models/user.js',
  ]);

  // Clear specified collections
  seeder.clearModels([], function() { //['Gallery', 'User']
    var User = mongoose.model('User');
    var newUser = new User({username: 'test2'});
    User.register(newUser, 'test2', function() {});
    var data = [{
      'model': 'Gallery',
      'documents': []
    }];
    var count = 0;
    for (var key in albums) {
      if (count <= 1500) continue;
      if (!albums.external && albums[key]['stub'].indexOf('http:') == -1) {
        count++;
        var images = [];
        var allimages = require('./albums/' + albums[key]['stub'] + '.json');
        for (var i in allimages.images) {
          images.push({
            src: 'http://richtrove.com/' + albums[key]['href'] + '/' +  allimages.images[i].replace('thumbnails/', 'images/'),
            thumb: 'http://richtrove.com/' + albums[key]['href'] + '/' +  allimages.images[i],
          });
        }
        data[0].documents.push({
          date: albums[key]['date'] ? new Date(albums[key]['date']) : null,
          stub: albums[key]['stub'],
          title: albums[key]['name'],
          images: images,
        });
      }
    }
    seeder.populateModels(data, function() {
    });
  });
});
