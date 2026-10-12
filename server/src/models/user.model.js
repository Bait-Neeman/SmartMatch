const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    idNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const bcrypt = require("bcrypt");
    this.password = await bcrypt.hash(this.password, 12);
  }
});

module.exports = mongoose.model("User", userSchema);
