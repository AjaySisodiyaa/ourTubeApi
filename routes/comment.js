const express = require("express");
const Router = express.Router();
const Comment = require("../models/Comment");
const checkAuth = require("../middleware/checkAuth");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

Router.post("/new-comment/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const newComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      user_id: verifiedUser._id,
      videoId: req.params.videoId,
      commentText: req.body.commentText,
    });
    const comment = await newComment.save();
    res.status(200).json({ newComment: comment });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Gel all comments for a video ----------------

Router.get("/:videoId", async (req, res) => {
  try {
    const comments = await Comment.find({
      videoId: req.params.videoId,
    }).populate("user_id", "channelName logoUrl");
    res.status(200).json({ commentList: comments });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//update comment ------------------------------

Router.put("/:commentId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const comment = await Comment.findById(req.params.commentId);

    if (comment.user_id != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this comment." });
    }
    comment.commentText = req.body.commentText;
    const updatedComment = await comment.save();
    res.status(200).json({ updatedComment });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

Router.delete("/:commentId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const comment = await Comment.findById(req.params.commentId);

    if (comment.user_id != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this comment." });
    }
    await Comment.findByIdAndDelete(req.params.commentId);
    res.status(200).json({ deletedData: "comment deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

module.exports = Router;
