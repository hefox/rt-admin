// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ImageSchema = new Schema({
  src: String,
  thumbnail: String
});

ImageSchema.virtual('displaySrc').get(function () {
  if (!this.src) {
    return '';
  }
  var src = this.src
  if (src.indexOf('public/') === 0) {
    src = src.substr(src.indexOf('/'));
  }
  return src;
});

var GallerySchema = new Schema({
  title: String,
  date: { type: Date, default: Date.now },
  external: Boolean,
  href: String,
  stub: String,
  images: [ImageSchema]
});

GallerySchema.virtual('pathedImages').get(function () {
  if (!this.images) {
    return [];
  }
  var images = [];
  for (var i = 0; i < this.images.length; i++) {
    images.push({src: this.images[i].displaySrc, _id: this.images[i]._id})
  }
  return images;
});
GallerySchema.virtual('firstImage').get(function () {
  if (!this.images) {
    return {};
  }
  return {src: this.images[0].displaySrc, id: this.images[0]._id}
});

mongoose.model('Gallery', GallerySchema);
mongoose.model('Image', ImageSchema);

