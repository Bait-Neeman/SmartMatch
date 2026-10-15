const { getCandidatesForUser, getMatchesForUser } = require("./match.service");
const { getIncomingInterests, getOutgoingInterests } = require("./interest.service");

const ACTIVE_STAGES = new Set(["active", "forwarded", "other-forwarded"]);

// Declined suggestions are omitted. Identity is attached only on active and matchmaker rows,
// and only while the interest is still accepted — the same check the profile and file routes use.
const getSuggestionLists = async (userId) => {
  const [newSuggestions, incoming, outgoing, matches] = await Promise.all([
    getCandidatesForUser(userId),
    getIncomingInterests(userId),
    getOutgoingInterests(userId),
    getMatchesForUser(userId),
  ]);

  return {
    newSuggestions,
    sent: outgoing.filter((item) => item.status === "pending"),
    received: incoming.filter((item) => item.status === "pending"),
    active: matches.filter((item) => ACTIVE_STAGES.has(item.stage)),
    matchmaker: matches.filter((item) => item.stage === "matchmaker"),
  };
};

module.exports = { getSuggestionLists };
