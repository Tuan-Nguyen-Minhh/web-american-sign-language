import React from "react";
import "./LoginRegister.css";
import { FaUser, FaLock, FaEnvelope, FaHome } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { useLogin } from "../../hooks/useLogin";
import { useRegister } from "../../hooks/useRegister";
import { useNavigation } from "../../hooks/useNavigation";
import usePasswordToggle from "../../hooks/usePasswordToggle";

export default function LoginRegister() {
  const { action, currentUser, isLoggedIn, registerLink, loginLink } =
    useAuth();
  const { handleReturnHome } = useNavigation();

  const {
    loginData,
    loginError,
    loginLoading,
    handleLoginChange,
    handleLoginSubmit,
  } = useLogin();

  const {
    registerData,
    registerError,
    registerLoading,
    registerSuccess,
    handleRegisterChange,
    handleRegisterSubmit,
  } = useRegister(loginLink);

  // Password toggle hooks - separate for each password field
  const loginPasswordToggle = usePasswordToggle();
  const registerPasswordToggle = usePasswordToggle();
  const confirmPasswordToggle = usePasswordToggle();

  // Check if passwords match in real-time
  const passwordsMatch = registerData.password === registerData.confirmPassword;
  const showMatchIndicator = registerData.confirmPassword.length > 0;

  return (
    <div className="login-page">
      {/* Return Home Button - Only show if user is logged in */}
      {isLoggedIn && (
        <div className="return-home-container">
          <button
            className="return-home-btn"
            onClick={handleReturnHome}
            title="Return to home page"
          >
            <FaHome className="home-icon" />
            <span>Return to Home</span>
          </button>
          <div className="current-user-info">
            Currently logged in as: <strong>{currentUser?.name}</strong>
          </div>
        </div>
      )}

      <div className={`wrapper${action}`}>
        {/* LOGIN FORM */}
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>

            {loginError && <div className="error-message">{loginError}</div>}

            <div className="input-box">
              <input
                type="text"
                name="username"
                placeholder="Username or Email"
                value={loginData.username}
                onChange={handleLoginChange}
                required
                disabled={loginLoading}
              />
              <FaUser className="icon-login" />
            </div>

            <div className="input-box password-input">
              <input
                type={loginPasswordToggle.inputType}
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
                disabled={loginLoading}
              />
              <FaLock className="icon-login" />
              <loginPasswordToggle.Icon
                className="password-toggle-icon"
                onClick={loginPasswordToggle.toggleVisibility}
                title={
                  loginPasswordToggle.visible
                    ? "Hide password"
                    : "Show password"
                }
              />
            </div>

            <div className="remember-forgot">
              <label>
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Login"}
            </button>

            <div className="register-link">
              <p>
                Don't have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    registerLink();
                  }}
                >
                  Signup
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* REGISTER FORM */}
        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Signup</h1>

            {registerError && (
              <div className="error-message">{registerError}</div>
            )}

            {registerSuccess && (
              <div className="success-message">
                Registration successful! Redirecting to login...
              </div>
            )}

            <div className="input-box">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={registerData.username}
                onChange={handleRegisterChange}
                required
                disabled={registerLoading}
              />
              <FaUser className="icon-login" />
            </div>

            <div className="input-box">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
                disabled={registerLoading}
              />
              <FaEnvelope className="icon-login" />
            </div>

            {/* PASSWORD INPUT */}
            <div className="input-box password-input">
              <input
                type={registerPasswordToggle.inputType}
                name="password"
                placeholder="Password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
                disabled={registerLoading}
                minLength={6}
              />
              <FaLock className="icon-login" />
              <registerPasswordToggle.Icon
                className="password-toggle-icon"
                onClick={registerPasswordToggle.toggleVisibility}
                title={
                  registerPasswordToggle.visible
                    ? "Hide password"
                    : "Show password"
                }
              />
            </div>

            {/* CONFIRM PASSWORD INPUT */}
            <div
              className={`input-box password-input ${
                showMatchIndicator
                  ? passwordsMatch
                    ? "password-match"
                    : "password-mismatch"
                  : ""
              }`}
            >
              <input
                type={confirmPasswordToggle.inputType}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                required
                disabled={registerLoading}
                minLength={6}
              />
              <FaLock className="icon-login" />
              <confirmPasswordToggle.Icon
                className="password-toggle-icon"
                onClick={confirmPasswordToggle.toggleVisibility}
                title={
                  confirmPasswordToggle.visible
                    ? "Hide password"
                    : "Show password"
                }
              />
            </div>

            {/* Password match message */}
            {showMatchIndicator && !passwordsMatch && (
              <div className="password-hint">Passwords do not match</div>
            )}

            <div className="remember-forgot">
              <label>
                <input type="checkbox" required />I agree to the terms &
                conditions
              </label>
            </div>

            <button type="submit" disabled={registerLoading}>
              {registerLoading ? "Signing up..." : "Signup"}
            </button>

            <div className="register-link">
              <p>
                Already have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    loginLink();
                  }}
                >
                  Login
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
