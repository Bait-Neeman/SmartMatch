const {
  getSettingsForUser,
  updateSettingsForUser,
  changePassword,
  deleteAccount,
} = require("../services/settings.service");

const getSettings = async (req, res) => {
  const settings = await getSettingsForUser(req.user.userId);
  res.status(200).json({ settings });
};

const updateSettings = async (req, res) => {
  const settings = await updateSettingsForUser(req.user.userId, req.body || {});
  res.status(200).json({ message: "ההגדרות עודכנו בהצלחה", settings });
};

const updatePassword = async (req, res) => {
  await changePassword(req.user.userId, req.body || {});
  res.status(200).json({ message: "הסיסמה עודכנה בהצלחה" });
};

const removeAccount = async (req, res) => {
  await deleteAccount(req.user.userId, req.body || {});
  res.status(200).json({ message: "החשבון נמחק" });
};

module.exports = { getSettings, updateSettings, updatePassword, removeAccount };
