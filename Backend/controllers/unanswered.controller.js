// controllers/unanswered.controller.js (NEW FILE)
const { Unanswered } = require("../Models/Collections");

exports.getUnanswered = async (req, res) => {
  try {
    const questions = await Unanswered.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUnanswered = async (req, res) => {
  try {
    await Unanswered.findByIdAndDelete(req.params.id);
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};