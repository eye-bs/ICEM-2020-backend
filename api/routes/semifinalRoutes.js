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

const semifinalCollection = require("../models/semifinalModels");
const gameHistoryCollection = require("../models/gameHistoryModels");

//swagger
router.post("/register/team", (req, res) => {
  var team_arr = req.body.teams;
  var no = req.query.no;
  var count = 0;

  var team = new semifinalCollection({
    _id: team_arr[count],
    no: no,
    items: {
      x2: true,
      x3: true
    },
    total_score: 0,
    exam: []
  });

  semifinalCollection.find((err, data) => {
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
    var team = new semifinalCollection({
      _id: team_arr[count],
      no: no,
      items: {
        x2: true,
        x3: true
      },
      total_score: 0,
      exam: []
    });
    if (count < team_arr.length) {
      semifinalCollection.find((err, data) => {
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

router.post("/item/:team", (req, res) => {
  var team = req.params.team;
  var item = req.query.item;
  var no = req.query.no;
  var update_items;
  var item_no = {
    "exam.$[target].item": item
  };
  if (item == "x2") {
    update_items = {
      "items.x2": false
    };
  } else {
    update_items = {
      "items.x3": false
    };
  }

  var to_set = Object.assign({}, update_items, item_no);
  semifinalCollection.update(
    {
      _id: team
    },
    {
      $set: to_set
    },
    {
      multi: false,
      arrayFilters: [{ "target._id": no }]
    },
    (err, data) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        var response = team + " use item " + item + " in No." + no;
        res.status(200).send(response);
      }
    }
  );
});

router.post("/prepare/game", (req, res) => {
  var no = req.query.no;
  var level = req.query.lev;
  var prepare_game = {
    _id: no,
    lev: level,
    item: "",
    image: "",
    correct: false,
    time_stamp: ""
  };
  semifinalCollection.updateMany(
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
                semi: {
                  _id: no,
                  level: level,
                  start_time: ""
                }
              }
            },
            (err, data) => {
              if (err) {
                res.status(500).send(err.message);
              } else {
                redisClient.setex("exam", 3600, no);
                redisClient.setex("round", 3600, "semifinal");
                var response = "Round : semifinal | Ready to play No." + no;
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
  var no = req.query.no;
  var teamName = req.params.team;
  var time_stamp = new Date();
  var buffers;

  if (req.busboy) {
    semifinalCollection.update(
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
      Key:   "semifinal/" + no + "/" + teamName + ".png", // File name you want to save as in S3
      Body: file.data
    };
    s3.upload(params, function(err, data) {
      if (err) {
        res.status(400).send(err.message);
        throw err;
      }
      //   console.log(`File uploaded successfully. ${data.Location}`);
      semifinalCollection.update(
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

module.exports = router;
