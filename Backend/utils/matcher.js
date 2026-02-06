module.exports = function matchQuery(message, solutions) {
  const userText = message.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const solution of solutions) {
    let score = 0;

    for (const keyword of solution.keywords) {
      const key = keyword.toLowerCase();

      if (userText.includes(key)) {
        score += 2;
      } else {
        const words = key.split(" ");
        words.forEach((word) => {
          if (userText.includes(word)) {
            score += 1;
          }
        });
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = solution;
    }
  }

  return {
    bestMatch,
    score: bestScore,
  };
};
