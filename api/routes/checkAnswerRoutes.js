const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Busboy = require("busboy");

const finalCollection = require("../models/finalModels");
const semifinalCollection = require("../models/semifinalModels");

router.get("/:round", (req, res) => {
  var round = req.params.round;
  var no = req.query.no;
  var semi_round = req.query.sr;
  var match_condition = round == "semifinal" ? {no: parseInt(semi_round)} : {"exam._id": no}
  var db_collection =
    round == "semifinal" ? semifinalCollection : finalCollection;
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
    (err, result) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        if (result.length != 0) {
          var res_arr = [];
          for (let i = 0; i < result.length; i++) {
            var img = result[i].exam[0].image;
            var obj = {
              team: result[i]._id,
              image: img
            };
            res_arr.push(obj);
          }
          res.status(200).send(res_arr);
        } else {
          res.status(404).send("exam not found");
        }
      }
    }
  );
});

router.post("/answer/:round", (req, res) => {
  var round = req.params.round;
  var no = req.query.no;
  var db_collection =
    round == "semifinal" ? semifinalCollection : finalCollection;
  var check = req.body.check;
  var count = 0;
  updateScore(check);

  function updateScore(check) {
    if (count < check.length) {
      db_collection.update(
        { _id: check[count].team },
        { $set: { "exam.$[target].correct": check[count].correct } },
        {
          multi: false,
          arrayFilters: [{ "target._id": no }]
        },
        (err, docs) => {
          count++;
          updateScore(check);
        }
      );
    } else {
      res.status(200).send("update successfully");
    }
  }
});

module.exports = router;
