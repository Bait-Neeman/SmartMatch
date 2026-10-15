import api from "../api/axios.js";

export const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

export const updateSettings = async (payload) => {
  const response = await api.patch("/settings", payload);
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await api.post("/settings/password", payload);
  return response.data;
};

export const deleteAccount = async (payload) => {
  const response = await api.delete("/settings", { data: payload });
  return response.data;
};
