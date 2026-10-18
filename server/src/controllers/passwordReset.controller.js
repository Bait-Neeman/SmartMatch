const { requestPasswordReset, resetPassword: resetPasswordWithToken } = require("../services/passwordReset.service");

const forgotPassword = async (req, res) => {
  const message = await requestPasswordReset(req.body || {});
  res.status(200).json({ message });
};

const resetPassword = async (req, res) => {
  const message = await resetPasswordWithToken(req.body || {});
  res.status(200).json({ message });
};

module.exports = { forgotPassword, resetPassword };
