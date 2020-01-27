const passport = require("passport"),
  passportJWT = require("passport-jwt"),
  ExtractJWT = passportJWT.ExtractJwt,
  JWTStrategy = passportJWT.Strategy,
  LocalStrategy = require("passport-local").Strategy;
var CryptoJS = require("crypto-js");
const SECRET = "ICEM-2020-Authentication";
const userCollection = require("../models/userModels");
// Mock Data
const user = {
  id: 1,
  sub: "nottdev",
  email: "nottdev@gmail.com"
};

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password"
    },
    (email, password, cb) => {
      var id = email;
      var password = password;
      if (id == null || password == null) {
        return cb(null, false, {
          message: "Invalid username or password"
        });
      } else {
        userCollection.findOne({ _id: id }, (err, user) => {
          if (err) {
            return cb(null, false, {
              message: err
            });
          } else {
            if (user == null || user == "") {
              return cb(null, false, {
                message: "User not found"
              });
            } else {
              var db_pass = user.password;
              var bytes = CryptoJS.AES.decrypt(db_pass, "[6Ipkri");
              var decrypt_password = bytes.toString(CryptoJS.enc.Utf8);
              console.log("db_pass = " , decrypt_password , "\n pass_api = " , password);
              if (password == decrypt_password) {
                var returnJSON;
                if (id.includes("team")|| id.includes("dev")) {
                  returnJSON = {
                    id: id,
                    team_name: user.team_name,
                    university: user.university
                  };
                } else if (id.includes("teacher")) {
                  returnJSON = {
                    id: id
                  };
                } else if (id.includes("admin")) {
                  returnJSON = {
                    id: id
                  };
                }
                return cb(null, returnJSON, {
                  message: "Logged In Successfully"
                });
              } else {
                return cb(null, false, {
                  message: "Incorrect email or password."
                });
              }
            }
          }
        });
      }
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET
    },
    (jwtPayload, cb) => {
      try {
        console.log(jwtPayload)
        userCollection.findOne({ _id: jwtPayload.id }, (err, docs) => {
          if (docs.length != 0) {
            return cb(null, jwtPayload);
          } else {
            return cb(error, false);
          }
        });
        // find the user in db if needed
        // if (jwtPayload.id == user.id) {
        //   return cb(null, user);
        // } else {
        //   return cb(null, false);
        // }
      } catch (error) {
        return cb(error, false);
      }
    }
  )
);
