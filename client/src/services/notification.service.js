import api from "../api/axios.js";

const asText = (value) => (typeof value === "string" ? value : "");

const toNotification = (item) => {
  const href = asText(item?.href);
  const id = asText(item?.id);
  const title = asText(item?.title);
  if (!id || !title || !href.startsWith("/")) return null;
  return {
    id,
    type: asText(item?.type),
    title,
    detail: asText(item?.detail),
    href,
    read: item?.read === true,
    createdAt: asText(item?.createdAt),
  };
};

export const getNotifications = async () => {
  const response = await api.get("/notifications");
  const notifications = Array.isArray(response.data?.notifications) ? response.data.notifications : [];
  return {
    notifications: notifications.map(toNotification).filter(Boolean),
    unreadCount: Number(response.data?.unreadCount) || 0,
    mailCount: Number(response.data?.mailCount) || 0,
  };
};

export const markNotificationRead = (id) => api.post(`/notifications/${encodeURIComponent(id)}/read`);

export const markAllNotificationsRead = () => api.post("/notifications/read-all");
