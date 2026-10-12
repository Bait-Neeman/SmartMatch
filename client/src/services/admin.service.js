import api from "../api/axios.js";

export const getAdminUsers = async () => {
  const response = await api.get("/admin/users");
  return response.data;
};

export const getAdminUserProfile = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/profile`);
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