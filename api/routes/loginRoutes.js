const express = require("express");
const router = express.Router();
var CryptoJS = require("crypto-js");
const mongoose = require("mongoose");

const userCollection = require("../models/userModels");
// swagger
router.post("/login", (req, res) => {
  id = req.body.username;
  password = req.body.password;
  if (id == null || password == null) {
    res.status(400).send("Invalid username or password");
  } else {
    userCollection.findOne({ _id: id }, (err, user) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        if (user == null || user == "") {
          res.status(404).send("User not found");
        } else {
          var db_pass = user.password;
          var bytes = CryptoJS.AES.decrypt(db_pass, "[6Ipkri");
          var decrypt_password = bytes.toString(CryptoJS.enc.Utf8);
          if (password == decrypt_password) {
            if (id.includes("team")) {
              if (user.team_name == "") {
                res.status(200).send({ first_login: true });
              } else {
                res.status(200).send({
                  first_login: false,
                  role: "student",
                  team_name: user.team_name,
                  university: user.university
                });
              }
            } else if (id.includes("teacher")) {
              res.status(200).send({
                role: "teacher"
              });
            } else if (id.includes("admin")) {
              res.status(200).send({
                role: "admin"
              });
            }
          } else {
            res.status(400).send("login failed , wrong password");
          }
        }
      }
    });
  }
});

// swagger
router.post("/register", (req, res) => {
  var team = req.query.team;
  var team_name = req.body.name;
  var university = req.body.university;
  if(team_name == undefined || university == undefined){
    res.status(400).send("Invalid registered form")
  }
  userCollection.update(
    { _id: team },
    {
      $set: { team_name: team_name, university: university }
    },
    (err, docs) => {
      if (err) {
        res.status(500).send(err.message);
      } else {
        if (docs.n == 0){
          res.status(404).send("team not found");
        }else{
          res.status(201).send("Registerd Success");
        }
        
      }
    }
  );
});

module.exports = router;
