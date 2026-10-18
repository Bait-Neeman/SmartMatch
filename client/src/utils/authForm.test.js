import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PASSWORD_TOO_LONG,
  authErrorMessage,
  destinationAfterLogin,
  emailError,
  normalizeEmail,
  passwordError,
} from "./authForm.js";
import { pathForSession } from "./session.js";

describe("auth form", () => {
  it("trims and lowercases an email before checking it", () => {
    assert.equal(normalizeEmail("  New.User@Example.TEST "), "new.user@example.test");
    assert.equal(emailError("  New.User@Example.TEST "), null);
    assert.equal(emailError("   "), "אימייל הוא שדה חובה");
    assert.equal(emailError("not-an-email"), "הזן כתובת אימייל תקינה");
  });

  it("accepts any non-empty password up to 72 bytes", () => {
    assert.equal(passwordError("1", "סיסמה היא שדה חובה"), null);
    assert.equal(passwordError("שלום"), null);
    assert.equal(passwordError("a".repeat(72)), null);
    assert.equal(passwordError("א".repeat(36)), null);
    assert.equal(passwordError("", "סיסמה היא שדה חובה"), "סיסמה היא שדה חובה");
    assert.equal(passwordError("a".repeat(73)), PASSWORD_TOO_LONG);
    assert.equal(passwordError("א".repeat(37)), PASSWORD_TOO_LONG);
    assert.equal(passwordError("ab\0c"), "הסיסמה אינה תקינה");
  });

  it("sends a new account through onboarding and an admin to the admin area", () => {
    assert.equal(destinationAfterLogin({ role: "user", hasProfile: false, hasPreferences: false }), "/profile");
    assert.equal(destinationAfterLogin({ role: "user", hasProfile: true, hasPreferences: false }), "/preferences");
    assert.equal(destinationAfterLogin({ role: "user", hasProfile: true, hasPreferences: true }), "/home");
    assert.equal(destinationAfterLogin({ role: "admin", hasProfile: false, hasPreferences: false }), "/admin");
    assert.equal(pathForSession({ isAdmin: false }, "/profile"), "/profile");
    assert.equal(pathForSession({ isAdmin: false }, "/preferences"), "/preferences");
    assert.equal(pathForSession({ isAdmin: false }, null), "/home");
    assert.equal(pathForSession({ isAdmin: true }, "/profile"), "/admin");
  });

  it("shows a Hebrew message for each auth failure", () => {
    assert.equal(authErrorMessage({}), "לא הצלחנו להתחבר לשרת. ודאו שהשרת פועל ונסו שוב.");
    assert.equal(
      authErrorMessage({ response: { status: 401, data: { message: "אימייל או סיסמה שגויים" } } }),
      "אימייל או סיסמה שגויים"
    );
    assert.equal(
      authErrorMessage({ response: { status: 429, data: { message: "יותר מדי ניסיונות התחברות לחשבון זה. נסו שוב בעוד 15 דקות." } } }),
      "יותר מדי ניסיונות התחברות לחשבון זה. נסו שוב בעוד 15 דקות."
    );
    assert.equal(authErrorMessage({ response: { status: 500, data: {} } }), "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.");
    assert.equal(
      authErrorMessage({ message: "Network Error" }, "שגיאה בהרשמה"),
      "לא הצלחנו להתחבר לשרת. ודאו שהשרת פועל ונסו שוב."
    );
  });
});
