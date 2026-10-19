const { getCandidatesForUser, getMatchesForUser } = require("./match.service");
const { getIncomingInterests, getOutgoingInterests } = require("./interest.service");
const { redactIdentity, withoutMatchPercent } = require("./privacy.service");

const ACTIVE_STAGES = new Set(["active", "forwarded", "other-forwarded"]);

// Declined suggestions stay in their own list. They are not deleted.
// Identity is copied only while this request still sees an accepted interest.
// A declined row is passed through the allow-list serializer with identity closed,
// even if an earlier response had revealed it.
const getSuggestionLists = async (userId) => {
  const [found, incoming, outgoing, matches] = await Promise.all([
    getCandidatesForUser(userId),
    getIncomingInterests(userId),
    getOutgoingInterests(userId),
    getMatchesForUser(userId),
  ]);

  const declined = [...outgoing, ...incoming]
    .filter((item) => item.status === "rejected" || item.stage === "declined")
    .map((item) => redactIdentity(item, { revealIdentity: false }));

  return {
    newSuggestions: withoutMatchPercent(found.candidates),
    hiddenByPreference: found.hiddenByPreference,
    sent: withoutMatchPercent(outgoing.filter((item) => item.status === "pending")),
    received: withoutMatchPercent(incoming.filter((item) => item.status === "pending")),
    active: withoutMatchPercent(matches.filter((item) => ACTIVE_STAGES.has(item.stage))),
    matchmaker: withoutMatchPercent(matches.filter((item) => item.stage === "matchmaker")),
    declined: withoutMatchPercent(declined),
  };
};

module.exports = { getSuggestionLists };
