const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { registerUser, loginUser } = require("../services/auth.service");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const TOKEN_EXPIRES_IN = "7d";

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  idNumber: user.idNumber,
  email: user.email,
  role: user.role,
});

const register = async (req, res) => {
  try {
    const { name, idNumber, email, password } = req.body || {};

    const user = await registerUser({ name, idNumber, email, password });
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user,
    });
  } catch (error) {
    console.error('Register error:', error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { idNumber, identifier, password } = req.body || {};

    const result = await loginUser({ idNumber, identifier, password });
    
    res.status(200).json({
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Login failed" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: "User data retrieved successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe };
