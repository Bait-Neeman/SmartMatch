const { getMatchesForUser, getCandidatesForUser } = require('../services/match.service');

const getMatches = async (req, res) => {
  const matches = await getMatchesForUser(req.user.userId);
  res.status(200).json({ matches });
};

const getCandidates = async (req, res) => {
  const candidates = await getCandidatesForUser(req.user.userId);
  res.status(200).json({ candidates });
};

module.exports = {
  getMatches,
  getCandidates,
};
