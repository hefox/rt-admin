var express = require('express');
var glob = require('glob');

var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');
var methodOverride = require('method-override');
var exphbs  = require('express-handlebars');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Handlebars     = require('handlebars');
var HandlebarsIntl = require('handlebars-intl');



module.exports = function(app, config) {
  var env = process.env.NODE_ENV || 'development';
  app.locals.ENV = env;
  app.locals.ENV_DEVELOPMENT = env == 'development';

  app.engine('handlebars', exphbs({
    layoutsDir: config.root + '/app/views/layouts/',
    defaultLayout: 'main',
    partialsDir: [config.root + '/app/views/partials/']
  }));
  app.set('views', config.root + '/app/views');
  HandlebarsIntl.registerWith(Handlebars);
  Handlebars.registerHelper('isChecked', function(val, arr) {
    return arr.indexOf(val) > -1 ? 'checked=checked' : '';
  });
  app.set('view engine', 'handlebars');

  // app.use(favicon(config.root + '/public/img/favicon.ico'));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser(config.secret ));
  app.use(require('express-session')({
      secret: config.secret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 60000 }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(compress());
  app.use(express.static(config.root + '/public'));
  app.use(methodOverride());

  // Add user and flash to render
  app.use(function(req, res, next){
    res.locals.user = req.user;
    res.locals.info = req.flash('info');
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
  });

  var controllers = glob.sync(config.root + '/app/controllers/*.js');
  controllers.forEach(function (controller) {
    require(controller)(app);
  });

  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  if(app.get('env') === 'development'){
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err,
        title: 'error'
      });
    });
  }

  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
      });
  });

  return app;
};
