// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ImageSchema = new Schema({
  src: String,
  thumb: String
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

ImageSchema.virtual('displayThumbnail').get(function () {
  if (!this.src) {
    return '';
  }
  if (this.thumb) {
    return this.thumb;
  }
  var src = this.src;
  // Local image, we can use the thumbnailizer.
  if (src.indexOf('public/') === 0) {
    src = src.substr(src.indexOf('/', src.indexOf('/') +1 ));
    return '/thumbnails'+ src;
  }
  return '';
});

var GallerySchema = new Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  external: Boolean,
  href: String,
  stub: {
    type: String,
    required: true,
    unique : true,
  },
  tags: [String],
  venues: [String],
  images: [ImageSchema]
});

GallerySchema.pre('save', function(next) {
  // do stuff
  if (!this.stub) {
    this.stub = this.title.replace(/[^a-zA-Z\d- ]/, '');
  }
  next();
});

GallerySchema.virtual('pathedImages').get(function () {
  if (!this.images) {
    return [];
  }
  var images = [];
  for (var i = 0; i < this.images.length; i++) {
    var local =
    images.push(
      {
        src: this.images[i].displaySrc,
        thumbnail: this.images[i].displayThumbnail,
        _id: this.images[i]._id
      })
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

