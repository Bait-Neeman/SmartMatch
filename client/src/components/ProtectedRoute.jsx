import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Checks for JWT token in localStorage before rendering
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // If no token exists, redirect to login
  if (!token) {
    console.log("No token found. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  // Token exists, render the protected component
  console.log("Token found. Rendering protected component.");
  return children;
}
