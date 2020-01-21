const express = require("express");
const router = express.Router();
var CryptoJS = require("crypto-js");
const jwt = require("jwt-simple");
const passport = require("passport");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;

const userCollection = require("../models/userModels");

router.post("/", (req, res) => {
    var team = req.query.team;
    var team_name = req.body.name;
    var university = req.body.university;
    if (team_name == undefined || university == undefined) {
      res.status(400).send("Invalid registered form");
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
          if (docs.n == 0) {
            res.status(404).send("team not found");
          } else {
            res.status(201).send("Registerd Success");
          }
        }
      }
    );
  });
  
  module.exports = router;
  