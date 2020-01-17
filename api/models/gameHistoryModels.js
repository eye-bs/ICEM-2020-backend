var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var historySchema = new Schema({
  _id: Number,
  semi: [
    {
      _id: String,
      level: String,
      start_time: String
    }
  ],
  final: [
    {
      _id: String,
      start_time: String,
      fastest: String
    }
  ]
});

module.exports = mongoose.model("history", historySchema);
