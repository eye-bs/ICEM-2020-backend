var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var teacheradminSchema = new Schema({
  _id: String,
  password: String,
});

module.exports = mongoose.model('teacheradminuser' , teacheradminSchema);