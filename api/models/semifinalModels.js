var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var semifinalSchema = new Schema({
  _id: String,
  no:Number,
  items:{
      x2 : Boolean,
      x3 : Boolean
  },
  total_score: Number,
  exam: [
      {
          _id: String,
          lev: String,
          item: String,
          image: String,
          correct: Boolean,
          time_stamp:String
      }
  ]
});

module.exports = mongoose.model('semifinal' , semifinalSchema);