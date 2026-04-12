const calculatePageOffset = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  return (parsedPage - 1) * parsedLimit;
};

const calculateTotalPages = (totalItems, limit) => {
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const parsedTotal = Math.max(0, parseInt(totalItems, 10) || 0);
  return Math.ceil(parsedTotal / parsedLimit);
};

const calculateVoteTotal = (upvotesArray) => {
  if (!Array.isArray(upvotesArray)) return 0;
  return upvotesArray.length;
};

module.exports = {
  calculatePageOffset,
  calculateTotalPages,
  calculateVoteTotal
};
