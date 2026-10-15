const { getSuggestionLists } = require("../services/suggestion.service");

const getLists = async (req, res) => {
  const lists = await getSuggestionLists(req.user.userId);
  res.status(200).json(lists);
};

module.exports = { getLists };
