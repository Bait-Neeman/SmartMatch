import api from "../api/axios.js";

export const createProfile = async (data) => {
  const response = await api.post("/api/profile", data);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get("/api/profile/me");
  return response.data;
};

export const getProfileByUserId = async (userId) => {
  const response = await api.get(`/api/profile/${userId}`);
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await api.put("/api/profile", data);
  return response.data;
};
