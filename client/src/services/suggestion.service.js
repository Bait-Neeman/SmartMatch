import api from "../api/axios.js";

// GET /api/suggestions — the lists added with the suggestions server work.
// newSuggestions, sent, and received stay anonymous.
// active holds mutually approved rows (stage active / accepted, forwarded, or other-forwarded).
// matchmaker holds rows both sides have forwarded.
// Each row includes stage, viewerForwarded, and otherForwarded.
// Name, phone, and resume size are included only while the match is still accepted.
export const getSuggestionLists = async () => {
  const response = await api.get("/suggestions");
  return response.data;
};

export const profileRequired = (error) =>
  error?.response?.status === 404 && String(error?.message || "").includes("פרופיל");
