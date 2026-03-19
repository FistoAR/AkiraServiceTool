const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalName: String,
  convertedName: String,
  path: String,
  timestamp: Number,
  type: String,
});

const solutionSchema = new mongoose.Schema(
  {
    title: String,
    keywords: [String],
    tags: [String],
    responseText: String,
    images: [fileSchema],
    videos: [fileSchema],
    product: String,
  },
  { timestamps: true }
);

const Unanswered = mongoose.model(
  "Unanswered",
  new mongoose.Schema(
    {
      query: String,
    },
    { timestamps: true }
  )
);

const Solutions = mongoose.model("Solution", solutionSchema);

module.exports = { Solutions, Unanswered };