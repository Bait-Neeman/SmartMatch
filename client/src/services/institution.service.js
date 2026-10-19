import api from "../api/axios.js";

export const getInstitutions = async () => {
  const response = await api.get("/institutions");
  return response.data;
};
