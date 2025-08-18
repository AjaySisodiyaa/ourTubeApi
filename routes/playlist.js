const express = require("express");
const Router = express.Router();
const PlayList = require("../models/PlayList");
const checkAuth = require("../middleware/checkAuth");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Types } = require("mongoose");

//Create a new playlist ----------------
Router.post("/:videoId", checkAuth, async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: "Playlist title is required" });
    }
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const newPlayList = new PlayList({
      _id: new mongoose.Types.ObjectId(),
      user_id: verifiedUser._id,
      video_id: [req.params.videoId],
      title: req.body.title,
    });
    const playList = await newPlayList.save();
    res.status(200).json({ playList });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Get playlist by id ----------------
Router.get("/:playlistId", async (req, res) => {
  try {
    const playlist = await PlayList.findById({
      _id: req.params.playlistId,
    }).populate("video_id", "title _id thumbnailUrl");

    res.status(200).json(playlist);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Get all playlist ----------------
Router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 4; // default limit = 20
    const skip = (page - 1) * limit;

    const playlist = await PlayList.find({})
      .populate("video_id user_id", "channelName logoUrl videoUrl thumbnailUrl")
      .sort({ createdAt: -1 }) // newest videos first
      .skip(skip)
      .limit(limit);
    const total = await PlayList.countDocuments(); // total videos in DB
    const hasMore = page * limit < total; // check if more pages exist

    res.status(200).json(playlist);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//add video to playlist ----------------
Router.post("/add-video/:playlistId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const playlist = await PlayList.findById({
      _id: req.params.playlistId,
    });
    if (playlist.user_id.toString() != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this playlist." });
    }
    if (req.body.title) {
      playlist.title = req.body.title;
    }
    if (req.body.video_id) {
      if (playlist.video_id.includes(req.body.video_id)) {
        return res
          .status(400)
          .json({ error: "Video already exists in playlist" });
      }
      playlist.video_id.push(req.body.video_id);
    }
    const updatedPlaylist = await playlist.save();
    res.status(200).json({ playlist: updatedPlaylist });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//remove video to playlist ----------------
Router.post("/remove-video/:playlistId", checkAuth, async (req, res) => {
  try {
    if (!req.body.video_id) {
      return res.status(400).json({ error: "Video id is required" });
    }
    const verifiedUser = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const playlist = await PlayList.findById({
      _id: req.params.playlistId,
    });
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }
    if (playlist.user_id.toString() != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this playlist." });
    }
    const videoId = req.body.video_id.toString().trim();

    const objectId = new Types.ObjectId(videoId);
    if (!playlist.video_id.includes(objectId)) {
      return res.status(400).json({ error: "Video not found in playlist" });
    }
    playlist.video_id.pull(objectId);

    const updatedPlaylist = await playlist.save();
    res.status(200).json({ playlist: updatedPlaylist });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//delete playlist ----------------
Router.delete("/:playlistId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const playlist = await PlayList.findById(req.params.playlistId);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }
    if (playlist.user_id.toString() != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this playlist." });
    }

    if (playlist.video_id.length > 0) {
      return res.status(400).json({ error: "This playlist is not empty" });
    }
    await PlayList.findByIdAndDelete(req.params.playlistId);

    res.status(200).json({ msg: "Playlist deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

module.exports = Router;
