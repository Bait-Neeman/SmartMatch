const { getMatchesForUser, getCandidatesForUser } = require('../services/match.service');
const HttpError = require('../utils/httpError');

const getMatches = async (req, res) => {
  const matches = await getMatchesForUser(req.user.userId);
  res.status(200).json({ matches });
};

const parseMinPercent = (raw) => {
  if (raw == null || raw === '') return undefined;
  const minPercent = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof minPercent !== 'number' || !Number.isFinite(minPercent) || minPercent < 0 || minPercent > 100) {
    throw new HttpError(400, 'ערך לא תקין בשדה אחוז התאמה');
  }
  return minPercent;
};

const getCandidates = async (req, res) => {
  const candidates = await getCandidatesForUser(req.user.userId, {
    minPercent: parseMinPercent(req.query.percent),
  });
  res.status(200).json({ candidates });
};

module.exports = {
  getMatches,
  getCandidates,
};
