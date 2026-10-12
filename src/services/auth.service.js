import api from "../api/axios.js";

export const registerUser = async (payload) => {
  const path = "/api/auth/register";
  console.log("registerUser request path:", (api.defaults.baseURL || "/api") + path);
  const response = await api.post(path, payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const path = "/api/auth/login";
  console.log("loginUser request path:", (api.defaults.baseURL || "/api") + path);
  const response = await api.post(path, payload);
  return response.data;
};

