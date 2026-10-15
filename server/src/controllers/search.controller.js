const { searchForViewer } = require("../services/search.service");

const search = async (req, res) => {
  const results = await searchForViewer(req.user, req.query?.q);
  res.status(200).json({ results });
};

module.exports = { search };
