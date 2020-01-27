const express = require("express");
const router = express.Router();
var CryptoJS = require("crypto-js");
(jwt = require("jsonwebtoken")), (passport = require("passport"));

const SECRET = "ICEM-2020-Authentication";

const userCollection = require("../models/userModels");

router.post("/", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (user) {
      console.log(user);
      const token = jwt.sign(user, SECRET);
      return res.json({ user, token });
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

router.post("/change/password/:id", (req, res) => {
  var id = req.params.id;
  var new_pass = req.body.new_pass;
  var encrypt_pass = CryptoJS.AES.encrypt(new_pass, "[6Ipkri").toString();
  userCollection.update(
    { _id: id },
    { $set: { password: encrypt_pass } },
    (err, docs) => {
      if (err) {
        res.status(500).send(err);
      } else {
        if (docs.n == 1) {
          res.send("update password successfully");
        } else {
          res.send("somthing went wrong");
        }
      }
    }
  );
});

// swagger
// router.post("/", ( req, res, next ) => {
//   id = req.body.username;
//   password = req.body.password;
//   if (id == null || password == null) {
//     res.status(400).send("Invalid username or password");
//   } else {
//     userCollection.findOne({ _id: id }, (err, user) => {
//       if (err) {
//         res.status(500).send(err.message);
//       } else {
//         if (user == null || user == "") {
//           res.status(404).send("User not found");
//         } else {
//           var db_pass = user.password;
//           var bytes = CryptoJS.AES.decrypt(db_pass, "[6Ipkri");
//           var decrypt_password = bytes.toString(CryptoJS.enc.Utf8);
//           if (password == decrypt_password) {
//             if (id.includes("team")) {
//               if (user.team_name == "") {
//                 res.status(200).send({ first_login: true });
//               } else {
//                 const payload = {
//                   sub: id,
//                   iat: new Date().getTime()
//                 };
//                 res.status(200).send({
//                   authen: jwt.encode(payload, SECRET),
//                   first_login: false,
//                   role: "student",
//                   team_name: user.team_name,
//                   university: user.university
//                 });
//               }
//             } else if (id.includes("teacher")) {
//               res.status(200).send({
//                 authen: jwt.encode(payload, SECRET),
//                 role: "teacher"
//               });
//             } else if (id.includes("admin")) {
//               res.status(200).send({
//                 authen: jwt.encode(payload, SECRET),
//                 role: "admin"
//               });
//             }
//           } else {
//             res.status(400).send("login failed , wrong password");
//           }
//         }
//       }
//     });
//   }
// });

// swagger
module.exports = router;
