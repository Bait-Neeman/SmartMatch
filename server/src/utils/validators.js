const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateIdNumber = (idNumber) => {
  // Israeli ID numbers are 9 digits
  const idRegex = /^\d{9}$/;
  return idRegex.test(idNumber);
};

const validatePassword = (password) => {
  // At least 8 characters, must contain numbers and letters
  return password && password.length >= 8;
};

const validateName = (name) => {
  return name && name.trim().length > 0;
};

module.exports = { validateEmail, validateIdNumber, validatePassword, validateName };
