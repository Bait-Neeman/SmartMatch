const {
  registerUser,
  loginUser,
  loginWithAccessCode,
  completeCredentialSetup,
  getUserById,
  saveIdentity,
} = require("../services/auth.service");
const { generateToken } = require("../config/jwt");

// Errors thrown here are sent by the error middleware (Express 5 forwards async errors).

const register = async (req, res) => {
  const { tokenVersion, ...user } = await registerUser(req.body || {});

  res.status(201).json({
    message: "ההרשמה בוצעה בהצלחה",
    token: generateToken(user._id, user.role, tokenVersion),
    user,
  });
};

const login = async (req, res) => {
  const { token, user } = await loginUser(req.body || {});

  res.status(200).json({
    message: "ההתחברות בוצעה בהצלחה",
    token,
    user,
  });
};

const getMe = async (req, res) => {
  const user = await getUserById(req.user.userId);
  res.status(200).json({ user });
};

const saveMyIdentity = async (req, res) => {
  const user = await saveIdentity(req.user.userId, req.body || {});
  res.status(200).json({ message: "הפרטים נשמרו", user });
};

const loginWithCode = async (req, res) => {
  const { token, user } = await loginWithAccessCode(req.body || {});
  res.status(200).json({
    message: "ההתחברות בוצעה בהצלחה",
    token,
    user,
  });
};

const saveAccountSetup = async (req, res) => {
  const { token, user } = await completeCredentialSetup(req.user.userId, req.body || {});
  res.status(200).json({
    message: "הפרטים נשמרו",
    token,
    user,
  });
};

module.exports = { register, login, getMe, saveMyIdentity, loginWithCode, saveAccountSetup };
