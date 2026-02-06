const { Solutions } = require("../Models/Collections");

exports.createSolution = async (req, res) => {
  try {
    const solution = await Solutions.create(req.body);
    res.json(solution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSolutions = async (req, res) => {
  try {
    const solutions = await Solutions.find().sort({ createdAt: -1 });
    res.json(solutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSolution = async (req, res) => {
  try {
    const solution = await Solutions.findByIdAndDelete(req.params.id);
    
    if (!solution) {
      return res.status(404).json({ error: "Solution not found" });
    }
    
    // Optional: Delete associated files from disk
    const fs = require("fs");
    
    solution.images.forEach((img) => {
      if (fs.existsSync(img.path)) {
        fs.unlinkSync(img.path);
      }
    });
    
    solution.videos.forEach((vid) => {
      if (fs.existsSync(vid.path)) {
        fs.unlinkSync(vid.path);
      }
    });
    
    res.json({ message: "Solution deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update solution.controller.js - Add PUT method
exports.updateSolution = async (req, res) => {
  try {
    const solution = await Solutions.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(solution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};