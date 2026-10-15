const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../services/notification.service");

const list = async (req, res) => {
  const payload = await listNotifications(req.user);
  res.status(200).json(payload);
};

const readOne = async (req, res) => {
  await markNotificationRead(req.user.userId, req.params.id);
  res.status(204).end();
};

const readAll = async (req, res) => {
  await markAllNotificationsRead(req.user.userId);
  res.status(204).end();
};

module.exports = { list, readOne, readAll };
