const express = require("express");
const app = express();
const mongoose = require("mongoose");
const userRoute = require("./routes/user.js");
const videoRoute = require("./routes/video.js");
const commentRoute = require("./routes/comment.js");
const playlistRoute = require("./routes/playlist.js");

const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");
app.use(cors());

const connectWithDatabase = async () => {
  try {
    const res = await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};
connectWithDatabase();

app.use(express.json());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/", // <– ensures a temp path exists
    createParentPath: true,
  })
);
app.use(bodyParser.json());
app.use("/user", userRoute);
app.use("/video", videoRoute);
app.use("/comment", commentRoute);
app.use("/playlist", playlistRoute);

module.exports = app;
