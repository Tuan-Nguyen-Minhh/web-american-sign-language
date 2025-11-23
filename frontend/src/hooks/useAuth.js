// hooks/useAuth.js
import { useState } from "react";
import { authService } from "../services/authService";

export function useAuth() {
  const [action, setAction] = useState("");
  const currentUser = authService.getUser();
  const isLoggedIn = authService.isAuthenticated();

  const registerLink = () => {
    setAction(" active");
  };

  const loginLink = () => {
    setAction("");
  };

  return {
    action,
    setAction,
    currentUser,
    isLoggedIn,
    registerLink,
    loginLink,
  };
}