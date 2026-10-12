import api from "../api/axios.js";

export const createPreferences = async (data) => {
  const response = await api.post("/preference", data);
  return response.data;
};

export const getMyPreferences = async () => {
  const response = await api.get("/preference/me");
  return response.data;
};

export const updatePreferences = async (data) => {
  const response = await api.put("/preference", data);
  return response.data;
};