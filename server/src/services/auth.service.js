const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  idNumber: user.idNumber,
  email: user.email,
  role: user.role,
});

const registerUser = async ({ name, idNumber, email, password }) => {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedIdNumber = idNumber?.trim();

  if (!name || !normalizedIdNumber || !password) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  const existingUserById = await User.findOne({ idNumber: normalizedIdNumber });
  if (existingUserById) {
    const isSameUserRetry = await bcrypt.compare(password, existingUserById.password);

    if (isSameUserRetry) {
      return buildUserResponse(existingUserById);
    }

    const error = new Error("A user with this ID number already exists.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedEmail) {
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) {
      const error = new Error("A user with this email already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  const user = await User.create({
    name: name.trim(),
    idNumber: normalizedIdNumber,
    email: normalizedEmail || undefined,
    password,
  });

  return buildUserResponse(user);
};

const loginUser = async ({ idNumber, identifier, password }) => {
  const loginValue = (identifier || idNumber)?.trim();
  const normalizedIdNumber = loginValue;

  if (!normalizedIdNumber || !password) {
    const error = new Error("ID number and password are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ idNumber: normalizedIdNumber });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: buildUserResponse(user),
  };
};

module.exports = {
  registerUser,
  loginUser,
};
