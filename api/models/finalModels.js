var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var finalSchema = new Schema({
  _id: String,
  total_score: Number,
  exam: [
      {
          _id: String,
          effect: Number,
          image: String,
          correct: Boolean,
          time_stamp:String
      }
  ]
});

module.exports = mongoose.model('finals' , finalSchema);