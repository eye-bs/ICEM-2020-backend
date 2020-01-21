const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var busboy = require("connect-busboy");
const jwt = require("jwt-simple");
const passport = require("passport");
const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;

const SECRET = "ICEM-2020-Authentication";

const userRoutes = require("./api/routes/userRoutes");
const loginRoutes = require("./api/routes/loginRoutes");
const uploadsImageRoutes = require("./api/routes/uploadImageRoutes");
const semifinalRoutes = require("./api/routes/semifinalRoutes");
const gameSessionRoutes = require("./api/routes/gameSessionRoutes");
const finalRoutes = require("./api/routes/finalRoutes");
const checkAnswerRoutes = require("./api/routes/checkAnswerRoutes");
const adminRoutes = require("./api/routes/adminRoutes");
const userCollection = require("./api/models/userModels");

mongoose.connect(
  "mongodb+srv://admin:admin123@cluster0-odrr2.gcp.mongodb.net/ICEM2020?retryWrites=true&w=majority",
  function(err) {
    if (err) throw err;
    console.log("Connect to MongoDB Atlas successful!");
  }
);

require('./api/configs/passport');

// const jwtOptions = {
//   jwtFromRequest: ExtractJwt.fromHeader("authorization"),
//   secretOrKey: SECRET
// };
// const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {
//   userCollection.findOne({ _id: payload.sub }, (err, docs) => {
//     if (docs.length != 0) {
//       done(null, true);
//     } else {
//       done(null, false);
//     }
//   });
// });

// passport.use(jwtAuth);
// const requireJWTAuth = passport.authenticate("jwt", { session: false });

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(busboy());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

app.use(express.static("uploads"));
app.use("/login", loginRoutes);
app.use("/users",passport.authenticate('jwt', {session: false}), userRoutes);
app.use("/aws", uploadsImageRoutes);
app.use("/semifinal", semifinalRoutes);
app.use("/final", finalRoutes);
app.use("/game", gameSessionRoutes);
app.use("/check", checkAnswerRoutes);
app.use("/admin", adminRoutes);

app.use("/health", (req, res, next) => {
  res.status(200).send("server-health");
});

app.use((req, res, next) => {
  const error = new Error("Not found!!");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  });
});

module.exports = app;
