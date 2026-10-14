import api from "../api/axios.js";

export const sendInterest = async (receiverId) => {
  const response = await api.post("/interest", { receiverId });
  return response.data;
};

export const getIncomingInterests = async () => {
  const response = await api.get("/interest/incoming");
  return response.data;
};

export const getOutgoingInterests = async () => {
  const response = await api.get("/interest/outgoing");
  return response.data;
};

export const acceptInterest = async (senderId) => {
  const response = await api.put("/interest/respond", {
    senderId,
    status: "accepted",
  });

  return response.data;
};

export const rejectInterest = async (senderId) => {
  const response = await api.put("/interest/respond", {
    senderId,
    status: "rejected",
  });

  return response.data;
};

export const sendToManager = async (otherUserId) => {
  const response = await api.post("/interest/send-to-manager", { otherUserId });
  return response.data;
};