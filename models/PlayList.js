const mongoose = require("mongoose");

const playListSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    video_id: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Video", default: [] },
    ],
    title: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PlayList", playListSchema);
