const express = require("express");
const Router = express.Router();
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const User = require("../models/User");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const checkAuth = require("../middleware/checkAuth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

Router.post("/signup", async (req, res) => {
  try {
    const users = await User.find({ email: req.body.email });
    if (users.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashCode = await bcrypt.hash(req.body.password, 10);
    const uploadedImage = await cloudinary.uploader.upload(
      req.files.logo.tempFilePath
    );
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashCode,
      logoUrl: uploadedImage.secure_url,
      logoId: uploadedImage.public_id,
    });
    const user = await newUser.save();
    res.status(201).json({ newUser: user });
  } catch (error) {
    console.log(error, "SIGNUP ROUTE ERROR-->");
    res.status(500).json({ error });
  }
});

Router.post("/login", async (req, res) => {
  try {
    const users = await User.find({ email: req.body.email });
    if (users.length === 0) {
      return res.status(400).json({ error: "Email is not Registered" });
    }

    const isvalid = await bcrypt.compare(req.body.password, users[0].password);
    if (!isvalid) {
      return res.status(400).json({ error: "Invalid Password" });
    }

    const token = jwt.sign(
      {
        _id: users[0]._id,
        channelName: users[0].channelName,
        email: users[0].email,
        phone: users[0].phone,
        logoId: users[0].logoId,
      },
      process.env.SECRET_KEY,
      { expiresIn: "365d" }
    );
    res.status(200).json({
      _id: users[0]._id,
      channelName: users[0].channelName,
      email: users[0].email,
      phone: users[0].phone,
      logoId: users[0].logoId,
      logoUrl: users[0].logoUrl,
      token,
      subscribers: users[0].subscribers,
      subscribedChannels: users[0].subscribedChannels,
    });
  } catch (error) {
    console.log(error, "LOGIN ROUTE ERROR-->");
    res.status(500).json({ error });
  }
});

// Subscribe Channel
Router.put("/subscribe/:userBId", checkAuth, async (req, res) => {
  try {
    const userA = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const userB = await User.findById(req.params.userBId);
    if (userB.subscribedBy.includes(userA._id)) {
      return res
        .status(400)
        .json({ error: "You are already subscribed to this channel" });
    }
    userB.subscribers += 1;
    userB.subscribedBy.push(userA._id);
    await userB.save();
    const userAFullInformation = await User.findById(userA._id);
    userAFullInformation.subscribedChannels.push(userB._id);
    await userAFullInformation.save();
    res.status(200).json({ msg: "Channel Subscribed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

// UnSubscribe Channel
Router.put("/unsubscribe/:userBId", checkAuth, async (req, res) => {
  try {
    const userA = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const userB = await User.findById(req.params.userBId);
    if (!userB.subscribedBy.includes(userA._id)) {
      return res
        .status(400)
        .json({ error: "You are not subscribed to this channel" });
    }
    userB.subscribers -= 1;
    userB.subscribedBy = userB.subscribedBy.filter(
      (userId) => userId.toString() != userA._id
    );
    await userB.save();
    const userAFullInformation = await User.findById(userA._id);
    userAFullInformation.subscribedChannels =
      userAFullInformation.subscribedChannels.filter(
        (userId) => userId.toString() != userB._id
      );
    await userAFullInformation.save();
    res.status(200).json({ msg: "Channel Unsubscribed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

// Update Channel
Router.post("/:userId", checkAuth, async (req, res) => {
  try {
    console.log(req.headers.authorization.split(" ")[1]);
    const verifiedUser = await jwt.verify(
      req.headers.authorization.split(" ")[1],
      process.env.SECRET_KEY
    );
    const user = await User.findById(req.params.userId);
    if (user._id != verifiedUser._id) {
      return res
        .status(400)
        .json({ error: "You are not authorized to update this channel" });
    }
    if (req.body.password) {
      const passwordValidate = await bcrypt.compare(
        req.body.oldpassword,
        user.password
      );
      if (!passwordValidate) {
        return res.status(400).json({ error: "Invalid Password" });
      }
      const possword = await bcrypt.hash(req.body.password, 10);
      user.password = possword;
      await user.save();
    }
    if (req.files.logo) {
      cloudinary.uploader.destroy(user.logoId);
      const uploadedImage = await cloudinary.uploader.upload(
        req.files.logo.tempFilePath
      );
      user.logoId = uploadedImage.public_id;
      user.logoUrl = uploadedImage.secure_url;

      await user.save();
    }

    if (req.body.channelName) {
      user.channelName = req.body.channelName;
      await user.save();
    }
    if (req.body.email) {
      user.email = req.body.email;
      await user.save();
    }
    if (req.body.phone) {
      user.phone = req.body.phone;
      await user.save();
    }
    res.status(200).json({ msg: "Channel Updated", user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

//get user by id ------------------------------
Router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

module.exports = Router;
