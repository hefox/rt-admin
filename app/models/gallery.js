// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ImageSchema = new Schema({
  src: String,
  thumbnail: String
});

var GallerySchema = new Schema({
  title: String,
  date: { type: Date, default: Date.now },
  external: Boolean,
  href: String,
  stub: String,
  images: [ImageSchema]
});

mongoose.model('Gallery', GallerySchema);
mongoose.model('Image', ImageSchema);

