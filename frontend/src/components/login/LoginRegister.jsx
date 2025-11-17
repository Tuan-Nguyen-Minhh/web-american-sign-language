import React, { useState } from "react";
import "./LoginRegister.css";
import { FaUser, FaLock, FaEnvelope } from "react-icons/fa";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function LoginRegister() {
  const [action, setAction] = useState("");
  const navigate = useNavigate();

  // Login state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const registerLink = () => {
    setAction(" active");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess(false);
  };

  const loginLink = () => {
    setAction("");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess(false);
  };

  // Handle login form change
  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
    setLoginError("");
  };

  // Handle register form change
  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value,
    });
    setRegisterError("");
  };

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      await authService.login(loginData.username, loginData.password);
      // Redirect to home or dashboard after successful login
      navigate("/home");
    } catch (error) {
      setLoginError(error.message || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle register submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterLoading(true);

    try {
      await authService.register(
        registerData.username,
        registerData.email,
        registerData.password
      );
      setRegisterSuccess(true);

      // Clear form
      setRegisterData({
        username: "",
        email: "",
        password: "",
      });

      // Switch to login after 2 seconds
      setTimeout(() => {
        loginLink();
      }, 2000);
    } catch (error) {
      setRegisterError(
        error.message || "Registration failed. Please try again."
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="login-page">
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

            <div className="input-box">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
                disabled={loginLoading}
              />
              <FaLock className="icon-login" />
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

            <div className="input-box">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
                disabled={registerLoading}
                minLength={6}
              />
              <FaLock className="icon-login" />
            </div>

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
