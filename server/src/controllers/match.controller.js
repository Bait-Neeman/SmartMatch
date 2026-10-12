const { getMatchesForUser, getCandidatesForUser } = require('../services/match.service');

const getMatches = async (req, res) => {
  try {
    const userId = req.user.userId;
    const matches = await getMatchesForUser(userId);
    res.status(200).json({ matches });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getCandidates = async (req, res) => {
  try {
    const userId = req.user.userId;
    const candidates = await getCandidatesForUser(userId);
    res.status(200).json({ candidates });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  getMatches,
  getCandidates,
};
