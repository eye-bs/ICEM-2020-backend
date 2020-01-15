var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var userSchema = new Schema({
  _id: String,
  password: String,
  team_name: String,
  university: String
});

module.exports = mongoose.model('user' , userSchema);