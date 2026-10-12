import api from "../api/axios.js";

export const createPreferences = async (data) => {
  const response = await api.post("/api/preference", data);
  return response.data;
};

export const getMyPreferences = async () => {
  const response = await api.get("/api/preference/me");
  return response.data;
};

export const updatePreferences = async (data) => {
  const response = await api.put("/api/preference", data);
  return response.data;
};
