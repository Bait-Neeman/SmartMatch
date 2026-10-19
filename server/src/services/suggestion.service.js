const { getCandidatesForUser, getMatchesForUser } = require("./match.service");
const { getIncomingInterests, getOutgoingInterests } = require("./interest.service");
const { redactIdentity } = require("./privacy.service");

const ACTIVE_STAGES = new Set(["active", "forwarded", "other-forwarded"]);

// Members do not see a match percent. The score is still used to sort and to
// apply a minimum, then removed from this response. Admin responses keep it.
const withoutMatchPercent = (value) => {
  if (Array.isArray(value)) return value.map(withoutMatchPercent);
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  delete copy.matchPercent;
  for (const key of ["sender", "receiver"]) {
    if (copy[key] && typeof copy[key] === "object") {
      copy[key] = { ...copy[key] };
      delete copy[key].matchPercent;
    }
  }
  return copy;
};

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
