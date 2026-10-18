import api from "../api/axios.js";

export const getAdminUsers = async () => {
  const response = await api.get("/admin/users");
  return response.data;
};

export const getAdminUserProfile = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/profile`);
  return response.data;
};

export const resetAdminUserPassword = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}/password`, payload);
  return response.data;
};

export const getPendingMatches = async () => {
  const response = await api.get("/admin/pending-matches");
  return response.data;
};

export const removePendingMatch = async ({ senderId, receiverId }) => {
  const response = await api.delete("/admin/pending-match", {
    data: { senderId, receiverId },
  });
  return response.data;
};

export const getAdminSummary = async () => {
  const response = await api.get("/admin/summary");
  return response.data;
};

export const getAdminCases = async () => {
  const response = await api.get("/admin/cases");
  return response.data;
};

export const updateAdminCase = async (id, payload) => {
  const response = await api.patch(`/admin/cases/${id}`, payload);
  return response.data;
};

export const searchAdmin = async (query) => {
  const response = await api.get("/admin/search", { params: { q: query } });
  return response.data;
};

export const getAdminSettings = async () => {
  const response = await api.get("/admin/settings");
  return response.data;
};

export const updateAdminSettings = async (payload) => {
  const response = await api.patch("/admin/settings", payload);
  return response.data;
};

export const updateAdminAccount = async (payload) => {
  const response = await api.put("/admin/account", payload);
  return response.data;
};

export const createAdminCandidate = async (payload) => {
  const response = await api.post("/admin/candidates", payload);
  return response.data;
};

export const createAdminMatchmaker = async (payload) => {
  const response = await api.post("/admin/matchmakers", payload);
  return response.data;
};
