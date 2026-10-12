import api from "../api/axios.js";

export const getMatches = async () => {
  const response = await api.get("/match/candidates");
  return response.data;
};