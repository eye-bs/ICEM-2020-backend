const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const redis = require("redis");

let redisClient;
redisClient = redis.createClient("6379","redis");


const finalCollection = require("../models/finalModels");
const semifinalCollection = require("../models/semifinalModels");
const gameHistoryCollection = require("../models/gameHistoryModels");

router.get("/score/:round", (req, res) => {
  var round = req.params.round;
  var no = req.query.no;
  var semi_round = req.query.sr;
  var match_condition =
    round == "semifinal" ? { no: parseInt(semi_round) } : { "exam._id": no };
  console.log(match_condition);
  var db_collection =
    round == "semifinal" ? semifinalCollection : finalCollection;

  if (no == "total") {
    db_collection.find((err, docs) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        res.status(200).send(docs);
      }
    });
  } else {
    db_collection.aggregate(
      [
        {
          $match: match_condition
        },
        {
          $project: {
            exam: {
              $filter: {
                input: "$exam",
                as: "exam",
                cond: { $eq: ["$$exam._id", no] }
              }
            }
          }
        }
      ],
      (err, docs) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          if (docs.length == 0) {
            res.status(404).send("this exam is not found");
          } else {
            res.status(200).send(docs);
          }
        }
      }
    );
  }
});

router.post("/update/score/:round", (req, res) => {
  var round = req.params.round;
  var no = req.query.no;
  var db_collection =
    round == "semifinal" ? semifinalCollection : finalCollection;
  var count = 0;
  var new_score = req.body.score;
  updateScore(new_score);
  /*
    [{
        team:String,
        correct:Boolean,
        effect:Number,
        item: String
    }]
    */
  function updateScore(new_score) {
    if (count < new_score.length) {
      var update = {};
      if (round == "semifinal") {
        update = {
          "exam.$[target].correct": new_score[count].correct,
          "exam.$[target].item": new_score[count].item
        };
      } else {
        update = {
          "exam.$[target].correct": new_score[count].correct,
          "exam.$[target].effect": new_score[count].effect
        };
      }
      db_collection.update(
        { _id: new_score[count].team },
        { $set: update },
        {
          multi: false,
          arrayFilters: [{ "target._id": no }]
        },
        (err, docs) => {
          count++;
          updateScore(new_score);
        }
      );
    } else {
      calculateTotalScore();
    }
  }
  function calculateTotalScore() {
    db_collection.find((err, docs) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        for (let i = 0; i < docs.length; i++) {
          var score = round == "semifinal" ? 0 : 200;
          for (let j = 0; j < docs[i].exam.length; j++) {
            var ex_num = docs[i].exam[j];
            if (round == "semifinal") {
              var lev_score;
              var item = ex_num.item;
              switch (ex_num.lev) {
                case "easy":
                  lev_score = 10;
                  break;
                case "intermediate":
                  lev_score = 20;
                  break;
                case "hard":
                  lev_score = 30;
                  break;
              }
              if (item == "x2") {
                if (ex_num.correct) {
                  lev_score = lev_score * 2;
                } else {
                  lev_score = lev_score * -1;
                }
              } else if (item == "x3") {
                if (ex_num.correct) {
                  lev_score = lev_score * 3;
                } else {
                  lev_score = lev_score * -2;
                }
              } else {
                if (!ex_num.correct) {
                  lev_score = 0;
                }
              }
              score = score + lev_score;
            } else {
              var get_score = ex_num.correct ? 0 : -20;
              var get_effect = ex_num.effect;
              score = score + get_score + get_effect;
            }
          }
          db_collection.update(
            { _id: docs[i]._id },
            {
              $set: {
                total_score: score
              }
            },
            (err, data) => {
              if (i == docs.length - 1) {
                res.status(201).send("updated");
              }
            }
          );
        }
      }
    });
  }
});

router.post("/set/session/:event", (req, res) => {
  var event = req.params.event;
  var timeout = req.query.timeout;
  var value = req.query.value
  redisClient.setex(event, timeout, value);
  redisClient.get(event, (err, v) => {
    var response = "set " + event + " to " + v ;
    res.status(200).send(response);
  })
 
});

router.post("/start/game", (req, res) => {
  var round;
  redisClient.get("round", (err, r) => {
    round = r;
    var no = req.query.no;
    var set_time = parseInt(req.query.time); // seconds
    var delay = req.query.time * 1000;
    var current_time = new Date();
    redisClient.setex("start-time", 70, current_time.toISOString());
    redisClient.setex("count-time", 70, set_time);
    current_time.setSeconds(current_time.getSeconds() + set_time);
    redisClient.setex("white-board", 3600, "true");
    redisClient.setex("timeout", 70, current_time.toISOString());
    redisClient.setex("exam", 3600, no);
    redisClient.setex("round", 7200, round);
    res.status(200).send("GAME START!!!");
    setTimeout(() => {
      redisClient.setex("white-board", 3600, "false");
      redisClient.del("exam");   
    }, delay);
  });
});

module.exports = router;
