const express = require("express");
const Router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Video = require("../models/Video");
const User = require("../models/User");
const mongoose = require("mongoose");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//get video by Id ------------------------------
Router.get("/video/:videoId", async (req, res) => {
  try {
    const video = await Video.findById({ _id: req.params.videoId }).populate(
      "user_id",
      "channelName logoUrl subscribers"
    );
    res.status(200).json({ video });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching video" });
  }
});

//get own video ------------------------------
Router.get("/own-video", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = await jwt.verify(token, process.env.SECRET_KEY);
    const videos = await Video.find({ user_id: user._id }).populate(
      "user_id",
      "channelName logoUrl"
    );
    res.status(200).json({ videos });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching video" });
  }
});

//get video by category ------------------------------
Router.get("/category/:category", async (req, res) => {
  try {
    const videos = await Video.find({ category: req.params.category });
    res.status(200).json({ videos });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching video" });
  }
});
//get video of Subscribed channel ------------------------------
Router.get("/subscribed/video", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = await jwt.verify(token, process.env.SECRET_KEY);
    const currentUser = await User.findById(verifiedUser._id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const subscribedVideo = await Video.find({
      user_id: {
        $in: currentUser.subscribedChannels,
      },
    });

    res.status(200).json(subscribedVideo);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching video" });
  }
});

// Get subscribed channels
Router.get("/subscribed/channel", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, process.env.SECRET_KEY);

    const currentUser = await User.findById(verifiedUser._id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const subscribedChannels = await User.find({
      _id: { $in: currentUser.subscribedChannels },
    });

    res.status(200).json(subscribedChannels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching subscribed channels" });
  }
});

// Get Channel videos
Router.get("/channel/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID" });
    }

    const videos = await Video.find({ user_id: channelId })
      .populate("user_id", "channelName logoUrl subscribers")
      .sort({ createdAt: -1 });

    if (!videos.length) {
      return res
        .status(404)
        .json({ message: "No videos found for this channel" });
    }

    res.status(200).json({ videos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching videos" });
  }
});

//Upload new video ------------------------------

Router.post("/upload", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = await jwt.verify(token, process.env.SECRET_KEY);
    const uploadedVideo = await cloudinary.uploader.upload(
      req.files.video.tempFilePath,
      { resource_type: "video" }
    );
    const uploadedThumbnail = await cloudinary.uploader.upload(
      req.files.thumbnail.tempFilePath
    );

    const newVideo = new Video({
      _id: new mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description,
      user_id: user._id,
      videoUrl: uploadedVideo.secure_url,
      videoId: uploadedVideo.public_id,
      thumbnailUrl: uploadedThumbnail.secure_url,
      thumbnailId: uploadedThumbnail.public_id,
      category: req.body.category,
      tags: req.body.tags.split(","),
    });

    const newUploadedVideoData = await newVideo.save();

    res.status(201).json({ newVideo: newUploadedVideoData });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Update video details ------------------------------
Router.post("/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const video = await Video.findById(req.params.videoId);
    if (video.user_id == verifiedUser._id) {
      if (req.files) {
        await cloudinary.uploader.destroy(video.thumbnailId);
        const uploadedThumbnail = await cloudinary.uploader.upload(
          req.files.thumbnail.tempFilePath
        );
        const updateData = {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags,
          thumbnailUrl: uploadedThumbnail.secure_url,
          thumbnailId: uploadedThumbnail.public_id,
        };
        const updatedVideoDetails = await Video.findByIdAndUpdate(
          req.params.videoId,
          updateData,
          { new: true }
        );
        res.status(200).json({ updatedVideo: updatedVideoDetails });
      } else {
        console.log(req.body.tags);
        const updateData = {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags,
        };
        const updatedVideoDetails = await Video.findByIdAndUpdate(
          req.params.videoId,
          updateData,
          { new: true }
        );
        res.status(200).json({ updatedVideo: updatedVideoDetails });
      }
    } else {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this video." });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Delete video  ------------------------------
Router.delete("/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const video = await Video.findById(req.params.videoId);
    if (video.user_id == verifiedUser._id) {
      await cloudinary.uploader.destroy(video.thumbnailId);
      await cloudinary.uploader.destroy(video.videoId, {
        resource_type: "video",
      });
      const deletedResponse = await Video.findByIdAndDelete(req.params.videoId);
      res.status(200).json({ deletedVideo: deletedResponse });
    } else {
      return res
        .status(400)
        .json({ error: "You are not authorized to delete this video." });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Like video  ------------------------------

Router.put("/like/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const video = await Video.findById(req.params.videoId);
    if (video.likedBy.includes(verifiedUser._id)) {
      return res
        .status(400)
        .json({ error: "You have already liked this video." });
    }
    if (video.dislikedBy.includes(verifiedUser._id)) {
      video.dislike -= 1;
      video.dislikedBy = video.dislikedBy.filter(
        (userId) => userId.toString() != verifiedUser._id
      );
    }
    video.likes += 1;
    video.likedBy.push(verifiedUser._id);
    await video.save();
    res.status(200).json({ msg: "Video Liked" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Dislike video  ------------------------------

Router.put("/dislike/:videoId", checkAuth, async (req, res) => {
  try {
    const verifiedUser = jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const video = await Video.findById(req.params.videoId);
    if (video.dislikedBy.includes(verifiedUser._id)) {
      return res
        .status(400)
        .json({ error: "You have already disliked this video." });
    }
    if (video.likedBy.includes(verifiedUser._id)) {
      video.likes -= 1;
      video.likedBy = video.dislikedBy.filter(
        (userId) => userId.toString() != verifiedUser._id
      );
    }
    video.dislike += 1;
    video.dislikedBy.push(verifiedUser._id);
    await video.save();
    res.status(200).json({ msg: "Video disliked" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

//Views API ------------------------------
Router.put("/views/:videoId", async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    video.views += 1;
    await video.save();
    res.status(200).json({ msg: "Video Viewed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error,
    });
  }
});

module.exports = Router;
