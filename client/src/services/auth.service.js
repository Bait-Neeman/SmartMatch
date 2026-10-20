import api from "../api/axios.js";

export const registerUser = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};

export const loginWithAccessCode = async (payload) => {
  const response = await api.post("/auth/code-login", payload);
  return response.data;
};

export const saveAccountCredentials = async (payload) => {
  const response = await api.post("/auth/account-setup", payload);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const saveIdentity = async (payload) => {
  const response = await api.post("/auth/identity", payload);
  return response.data;
};

export const requestPasswordReset = async (payload) => {
  const response = await api.post("/auth/forgot-password", payload);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await api.post("/auth/reset-password", payload);
  return response.data;
};
