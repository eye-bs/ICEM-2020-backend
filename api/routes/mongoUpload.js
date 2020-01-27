const express = require("express");
const router = express.Router();
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const redis = require("redis");

let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient("redis://68.183.230.159");
} else {
  redisClient = redis.createClient();
}

const mongoURI =
  "mongodb+srv://admin:admin123@cluster0-odrr2.gcp.mongodb.net/ICEM2020?retryWrites=true&w=majority";
const conn = mongoose.createConnection(mongoURI);
let gfs;

const finalCollection = require("../models/finalModels");
const semifinalCollection = require("../models/semifinalModels");
const gameHistoryCollection = require("../models/gameHistoryModels");

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    var fileName =
      req.query.round + "_" + req.query.no + "_" + req.params.team + ".png";
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const fileInfo = {
          filename: fileName,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 1mb, you can change as needed.
  }
});

router.post("/send/answer/:team", upload.single("file"), (req, res) => {
  var img = req.file;
  var teamName = req.params.team;
  var round = req.query.round;
  var no = req.query.no;
  var time_stamp = new Date(req.query.time);
  var db_collection =
    round == "semifinal" ? semifinalCollection : finalCollection;

  gfs.files.find({ filename: img.filename }).toArray((err, file) => {
    // Check if file
    if (!file || file.length <= 1) {
      updateAnswers();
    } else {
      gfs.remove({ _id: file[0]._id, root: "uploads" }, (err, gridStore) => {
        if (err) {
          return res.status(404).json({ err: err });
        }
        updateAnswers();
      });
    }
  });
  function updateAnswers() {
    db_collection.update(
      {
        _id: teamName
      },
      {
        $set: {
          "exam.$[target].time_stamp": time_stamp.toISOString(),
          "exam.$[target].image": img.filename
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
  }
});

// @route GET /files
// @desc  Display all files in JSON
router.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist"
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
router.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
router.get("/display/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }

    // Check if image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image"
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
router.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
    res.redirect("/");
  });
});
//! game

router.get("/session/data", (req, res) => {
  var response = {
    white_board: "",
    start_time: "",
    count_time: "",
    timeout: "",
    exam: "",
    round: ""
  };
  redisClient.get("white-board", (err, wb) => {
    response.white_board = wb;
  });
  redisClient.get("start-time", (err, st) => {
    response.start_time = st;
  });
  redisClient.get("count-time", (err, ct) => {
    response.count_time = ct;
  });
  redisClient.get("timeout", (err, to) => {
    response.timeout = to;
  });
  redisClient.get("exam", (err, ex) => {
    response.exam = ex;
  });
  redisClient.get("round", (err, r) => {
    response.round = r;
    res.status(200).send(response);
  });
});

router.post("/prepare/game", (req, res) => {
  var no = req.query.no;
  var level = req.query.lev;
  var round = null;
  var prepare_game_semi = {
    _id: no,
    lev: level,
    item: "",
    image: "",
    correct: false,
    time_stamp: ""
  };
  var prepare_game_final = {
    _id: no,
    effect: 0,
    image: "",
    correct: false,
    time_stamp: ""
  };
  redisClient.get("round", (err, r) => {
    round = r;
    var db_collection =
      round == "semifinal" ? semifinalCollection : finalCollection;
    var prepare_game =
      round == "semifinal" ? prepare_game_semi : prepare_game_final;
    db_collection.updateMany(
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
            redisClient.setex("exam", 7200, no);
            redisClient.setex("round", 7200, round);
            var response = "Round : " + round + " | Ready to play No." + no;
            res.status(200).send(response);
          }
        }
      }
    );
  });
});

router.post("/register/team", (req, res) => {
  var team_arr = req.body.teams;
  var count = 0;
  var no = req.query.no;
  var round;
  var db_collection;
  var team_final = new finalCollection({
    _id: team_arr[count],
    total_score: 200,
    exam: []
  });

  var team_semi = new semifinalCollection({
    _id: team_arr[count],
    no: no,
    items: {
      x2: true,
      x3: true
    },
    total_score: 0,
    exam: []
  });

  var team;

  redisClient.get("round", (err, r) => {
    round = r;
    if (round == null) {
      res.status(400).send("Invalid ROUND");
    } else {
      db_collection =
        round == "semifinal" ? semifinalCollection : finalCollection;
      team = round == "semifinal" ? team_semi : team_final;
      db_collection.find((err, data) => {
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
    }
  });
  function saveTeams(team_arr) {
    if (count < team_arr.length) {
      db_collection.find((err, data) => {
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
        team_arr.toString() +
        " ready to play " +
        round +
        " round, create player successfully";
      res.status(201).send(response);
    }
  }
});

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
