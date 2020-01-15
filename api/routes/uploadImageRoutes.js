const AWS = require("aws-sdk");
const Busboy = require("busboy");
const express = require("express");
const router = express.Router();

const BUCKET_NAME = "icem2020";
const ID = "AKIAIUFOMVHDUGAIY5UQ";
const SECRET = "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";

router.post("/image", (req, res, next) => {
  var image;
  var folder = req.query.r;
  var teamName = req.query.t;
  var buffers;
  console.log(teamName, "\n", folder);
  if (req.busboy) {
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
  // etc ...

  function uploadToS3(file) {
    const s3 = new AWS.S3({
      accessKeyId: ID,
      secretAccessKey: SECRET
    });


    const params = {
      Bucket: BUCKET_NAME,
      Key:  folder + "/" + teamName + ".png", // File name you want to save as in S3
      Body: file.data
    };
    s3.upload(params, function(err, data) {
      if (err) {
        res.status(400).send(err.message);
        throw err;
      }
      console.log(`File uploaded successfully. ${data.Location}`);
      res.status(200).send(data.Location);
    });
  }
});

module.exports = router;
