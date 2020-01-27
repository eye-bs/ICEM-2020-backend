const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const redis = require("redis");
let redisClient;
  redisClient = redis.createClient("6379","redis");


const gameHistoryCollection = require("../models/gameHistoryModels");

router.post("/control", async (req, res) => {
  var white_board = req.query.wb;
  var number = req.query.no;
  redisClient.setex("white-board", 3600, white_board);
  redisClient.get("white-board", (err, data) => {
    console.log("data", data);
    if (data == "true" && !err) {
      redisClient.get("exam", (err, exam) => {
        if (!err && exam) {
          var date = new Date();
          gameHistoryCollection.update(
            { _id: 0 },
            {
              $set: {
                "semi.$[target].start_time": date.toISOString()
              }
            },
            {
              multi: false,
              arrayFilters: [{ "target._id": number }]
            },
            (err, docs) => {
              if (err) {
                res.status(500).send(err.message);
              } else {
                if (docs.n) {
                  if (docs.nModified) {
                    res.status(200).send("Game start!!!");
                  } else {
                    res.status(200).send("this exam is invalid");
                  }
                }
              }
            }
          );
        }
      });
    } else {
      res.status(200).send("white board is closed");
    }
  });
});

router.get("/status", async (req, res) => {
  var event = req.query.event;
  redisClient.get(event, (err, reply) => {
    if (!err && reply) {
      res.status(200).send({ event: event, status: reply });
    } else {
      redisClient.setex(event, 3600, false);
      redisClient.get(event, (err, redis) => {
        res.status(200).send({ event: event, status: redis });
      });
    }
  });
});

router.post("/create/his-collection", (req, res) => {
  var his_data = new gameHistoryCollection({
    _id: 0,
    semi: [],
    final: []
  });
  gameHistoryCollection.find((err, docs) => {
    if (err) {
      res.status(500).send(err);
    } else {
      his_data.save().then(() => {
        res.send("created");
      });
    }
  });
});

module.exports = router;
