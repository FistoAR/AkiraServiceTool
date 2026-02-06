const matchQuery = require("../utils/matcher");

const { Solutions, Unanswered } = require("../Models/Collections");


exports.askQuestion = async (req, res) => {
  const { message } = req.body;

  const solutions = await Solutions.find();
  const { bestMatch, score } = matchQuery(message, solutions);

  if (!bestMatch || score < 2) {
    await Unanswered.create({ query: message });

    return res.json({
      reply:
        "Sorry, I couldn't understand your issue. Our support team will contact you.",
    });
  }


  res.json({
    reply: bestMatch.responseText,
    images: bestMatch.images,
    videos: bestMatch.videos,
  });
};
