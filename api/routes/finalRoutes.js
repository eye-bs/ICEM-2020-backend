const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const redis = require("redis");
const Busboy = require("busboy");

const BUCKET_NAME = "icem2020";
const ID = "AKIAIUFOMVHDUGAIY5UQ";
const SECRET = "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";

let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
} else {
  redisClient = redis.createClient();
}

const finalCollection = require("../models/finalModels");
const gameHistoryCollection = require("../models/gameHistoryModels");

router.post("/register/team", (req, res) => {
  var team_arr = req.body.teams;
  var count = 0;

  var team = new finalCollection({
    _id: team_arr[count],
    total_score: 200,
    exam: []
  });

  finalCollection.find((err, data) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      team
        .save()
        .then(() => {
          if (count < team_arr.length) {
            count++;
            saveTeams(team_arr);
          }
        })
        .catch(err => {
          res.status(500).json({ message_out: err.message });
        });
    }
  });

  function saveTeams(team_arr) {
    var team = new finalCollection({
      _id: team_arr[count],
      total_score: 200,
      exam: []
    });
    if (count < team_arr.length) {
      finalCollection.find((err, data) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          team
            .save()
            .then(() => {
              count++;
              saveTeams(team_arr);
            })
            .catch(err => {
              res.status(500).json({ message_in: err.message });
            });
        }
      });
    } else {
      var response =
        team_arr.toString() + " ready to play, create player successfully";
      res.status(201).send(response);
    }
  }
});

router.post("/prepare/game", (req, res) => {
  var no = req.query.no;
  var prepare_game = {
    _id: no,
    effect: 0,
    image: "",
    correct: false,
    time_stamp: ""
  };
  finalCollection.updateMany(
    { "exam._id": { $ne: no } },
    {
      $push: { exam: prepare_game }
    },
    (err, docs) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        if (docs.n == 0 || docs.nModified == 0) {
          res
            .status(400)
            .send('this exam is already processed use "PUT" to edit');
        } else {
          gameHistoryCollection.update(
            {
              $push: {
                final: {
                  _id: no,
                  start_time: "",
                  fastest: ""
                }
              }
            },
            (err, data) => {
              if (err) {
                res.status(500).send(err.message);
              } else {
                redisClient.setex("exam", 3600, no);
                redisClient.setex("round", 3600, "final");
                var response = "Round : final | Ready to play No." + no;
                res.status(200).send(response);
              }
            }
          );
        }
      }
    }
  );
});

router.post("/send/answer/:team", (req, res, next) => {
  var image;
  var folder = req.query.r;
  var no = req.query.no;
  var teamName = req.params.team;
  var time_stamp = new Date();
  var buffers;

  if (req.busboy) {
    finalCollection.update(
      {
        _id: teamName
      },
      {
        $set: {
          "exam.$[target].time_stamp": time_stamp.toISOString()
        }
      },
      {
        multi: false,
        arrayFilters: [{ "target._id": no }]
      },
      (err, data) => {
        parseImage();
      }
    );
  }
  // etc ...

  function parseImage() {
    var busboy = new Busboy({ headers: req.headers });
    busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
      console.log(
        "File [" +
          fieldname +
          "]: filename: " +
          filename +
          ", encoding: " +
          encoding +
          ", mimetype: " +
          mimetype +
          ",file:" +
          file
      );
      file.on("data", function(data) {
        console.log("File [" + fieldname + "] got " + data.length + " bytes");
        if (buffers == null) {
          buffers = data;
        } else {
          buffers = Buffer.concat([buffers, data]);
          image = {
            data: buffers,
            name: filename
          };
        }
      });
      file.on("end", function() {
        console.log("File [" + fieldname + "] Finished");
      });
    });
    busboy.on("field", function(
      fieldname,
      val,
      fieldnameTruncated,
      valTruncated,
      encoding,
      mimetype
    ) {
      console.log("Field [" + fieldname + "]: value: " + inspect(val));
    });
    busboy.on("finish", function() {
      console.log("Done parsing form!");
      uploadToS3(image);
    });
    req.pipe(busboy);
  }

  function uploadToS3(file) {
    const s3 = new AWS.S3({
      accessKeyId: ID,
      secretAccessKey: SECRET
    });
    const params = {
      Bucket: BUCKET_NAME,
      Key:  "final/" + no + "/" + teamName + ".png", // File name you want to save as in S3
      Body: file.data
    };
    s3.upload(params, function(err, data) {
      if (err) {
        res.status(400).send(err.message);
        throw err;
      }
      //   console.log(`File uploaded successfully. ${data.Location}`);
      finalCollection.update(
        {
          _id: teamName
        },
        {
          $set: {
            "exam.$[target].image": data.Location
          }
        },
        {
          multi: false,
          arrayFilters: [{ "target._id": no }]
        },
        (err, data) => {
          if (err) {
            res.status(500).send(err.message);
          } else {
            res.status(200).send("send answer successfully");
          }
        }
      );
    });
  }
});

router.get("/fastest", (req, res) => {
  var no = req.query.no;

  finalCollection.aggregate(
    [
      {
        $match: { "exam._id": no }
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
          var time_arr = [];
          var time_sort = [];
          for (let i = 0; i < result.length; i++) {
            var time_stamp = result[i].exam[0].time_stamp;
            if (time_stamp != "") {
              time_arr.push(time_stamp);
              time_sort.push(time_stamp);
            }
          }
          time_sort.sort();
          var fastest_index = time_arr.indexOf(time_sort[0]);
          var fastest_obj = {
            team: result[fastest_index]._id,
            time_stamp: time_arr[fastest_index]
          };
          saveToHistory(result[fastest_index]._id);
          res.status(200).send(fastest_obj);
        }
      }
    }
  );
  function saveToHistory(team) {
    gameHistoryCollection.update(
      { _id: 0 },
      {
        $set: {
          "final.$[target].fastest": team
        }
      },
      {
        multi: false,
        arrayFilters: [{ "target._id": no }]
      },
      (err, data) => {
        console.log("successfully");
      }
    );
  }
});

module.exports = router;
