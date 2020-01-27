const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var busboy = require("connect-busboy");
const passport = require("passport");


const userRoutes = require("./api/routes/userRoutes");
const loginRoutes = require("./api/routes/loginRoutes");
const semifinalRoutes = require("./api/routes/semifinalRoutes");
const gameSessionRoutes = require("./api/routes/mongoUpload");
const finalRoutes = require("./api/routes/finalRoutes");
const checkAnswerRoutes = require("./api/routes/checkAnswerRoutes");
const adminRoutes = require("./api/routes/adminRoutes");
const registerRoutes = require("./api/routes/registerRoutes");
// const mongoUpload = require("./api/routes/mongoUpload")
const methodOverride = require('method-override');
//const dburl = "68.183.230.159"
const dburl = "icem-db"
mongoose.connect(
  "mongodb://" + dburl + "/ICEM2020", 
  function(err) {
    if (err) throw err;
    console.log("----------------Connect to MongoDB at " + dburl + " successful!----------------");
  }
);

require('./api/configs/passport');

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(busboy());
app.use(methodOverride('_method'));

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

app.use(express.static("uploads"));
app.use("/login", loginRoutes);
app.use("/register", registerRoutes);
app.use("/users",passport.authenticate('jwt', {session: false}), userRoutes);
// app.use("/users", userRoutes);
app.use("/semifinal", semifinalRoutes);
app.use("/final", finalRoutes);
app.use("/game", gameSessionRoutes);
app.use("/check", checkAnswerRoutes);
app.use("/admin", adminRoutes);
// app.use("/images" , mongoUpload)

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
