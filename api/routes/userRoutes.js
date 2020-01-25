const express = require("express");
const router = express.Router();
var CryptoJS = require("crypto-js");
const redis = require("redis");

const userCollection = require("../models/userModels");
const finalCollection = require("../models/finalModels");
const semifinalCollection = require("../models/semifinalModels");

let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient(process.env.REDIS_URL);
} else {
  redisClient = redis.createClient();
}

//swagger
router.post("/new", (req, res) => {
  var newPass = generatePass();
  var encrypt_pass = CryptoJS.AES.encrypt(newPass, "[6Ipkri").toString();
  userCollection.aggregate(
    [
      {
        $group: {
          _id: 0,
          user: { $push: "$_id" }
        }
      }
    ],
    (err, docs) => {
      if (err) {
        res.status(500).send(err);
      } else {
        var count_team = docs.length == 0 ? 1 : docs[0].user.length + 1 - 2;
        var num_team = count_team < 10 ? "0" + count_team : count_team;
        var new_team = "team" + num_team;
        var userData = new userCollection({
          _id: new_team,
          password: encrypt_pass,
          team_name: "",
          university: ""
        });
        userCollection.find((err, user) => {
          if (err) {
            res.status(500).send(err);
          } else {
            userData.save().then(() => {
              userData.password = newPass;
              res.status(201).send(userData);
            });
          }
        });
      }
    }
  );
});

router.get("/profile", (req, res, next) => {
  res.send(req.user);
});

function generatePass() {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get("/all/login", (req, res) => {
  userCollection.find((err, docs) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      var user_arr = [];
      for (let i = 0; i < docs.length; i++) {
        var db_pass = docs[i].password;
        var bytes = CryptoJS.AES.decrypt(db_pass, "[6Ipkri");
        var decrypt_password = bytes.toString(CryptoJS.enc.Utf8);
        var obj = {
          id: docs[i]._id,
          password: decrypt_password
        };
        user_arr.push(obj);
      }
      res.status(200).send(user_arr);
    }
  });
});

router.post("/new/ta", (req, res) => {
  var teacher_pass = generatePass();
  var admin_pass = generatePass();
  var encrypt_teacher_pass = CryptoJS.AES.encrypt(
    teacher_pass,
    "[6Ipkri"
  ).toString();
  var encrypt_admin_pass = CryptoJS.AES.encrypt(
    admin_pass,
    "[6Ipkri"
  ).toString();

  var teacherData = new userCollection({
    _id: "teacher",
    password: encrypt_teacher_pass
  });
  var adminData = new userCollection({
    _id: "admin",
    password: encrypt_admin_pass
  });
  userCollection.find((err, docs) => {
    if (err) {
      res.status(500).send(err);
    } else {
      teacherData.save();
      adminData.save().then(() => {
        res.status(201).send("Created");
      });
    }
  });
});

router.get("/game/time", (req, res) => {
  redisClient.get("white-board", (err, wb) => {
    if (!err && wb == "true") {
      redisClient.get("start-time", (err, st) => {
        if (!err) {
          redisClient.get("count-time", (err, ct) => {
            if (!err) {
              var response = {
                white_board: true,
                start_time: st,
                couter_time: ct
              };
              res.status(200).send(response);
            } else {
              res.status(500).send("Error");
            }
          });
        }
      });
    } else {
      res.status(200).send({ white_board: false });
    }
  });
});

router.get("/score/:round", (req, res) => {
  var user = req.user;
  var team = user.id;
  var round = req.params.round;
  var db_collection =
  round == "semifinal" ? semifinalCollection : finalCollection;

  if(round == undefined  || round == "" || team == undefined || team == ""){
    res.status(400).send("Invalid team or round")
  }else{
     db_collection.aggregate([
    { $match: { _id: team } },
    {
      $project: {
        _id: "$_id",
        total_score: "$total_score"
      }
    }
  ],(err,data) => {
    if(err){
      res.send(err);
    }else{
      res.status(200).send(data[0]);
    }
  });
  }

 
});

module.exports = router;
