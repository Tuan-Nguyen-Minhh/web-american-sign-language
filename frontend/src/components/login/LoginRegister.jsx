import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import "./LoginRegister.css";
import { FaUser } from "react-icons/fa";
import { FaLock } from "react-icons/fa";
import { FaEnvelope } from "react-icons/fa";

export default function LoginRegister() {
  const [action, setAction] = useState("");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const registerLink = () => {
    setAction(" active");
    setError("");
  };

  const loginLink = () => {
    setAction("");
    setError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.login(loginData.username, loginData.password);
      login(response.access_token, { email: loginData.username });
      navigate("/"); // Redirect to homepage
    } catch (error) {
      setError(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Add register API call here when backend supports it
      alert("Registration functionality coming soon!");
    } catch (error) {
      setError(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className={`wrapper${action}`}>
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>
            {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
            <div className="input-box">
              <input 
                type="email" 
                placeholder="Email" 
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                required 
              />
              <FaUser className="icon-login" />
            </div>
            <div className="input-box">
              <input 
                type="password" 
                placeholder="Password" 
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required 
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

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="register-link">
              <p>
                Don't have an account?{" "}
                <a href="#" onClick={registerLink}>
                  Signup
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Signup</h1>
            {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
            <div className="input-box">
              <input 
                type="text" 
                placeholder="Name" 
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                required 
              />
              <FaUser className="icon-login" />
            </div>
            <div className="input-box">
              <input 
                type="email" 
                placeholder="Email" 
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                required 
              />
              <FaEnvelope className="icon-login" />
            </div>
            <div className="input-box">
              <input 
                type="password" 
                placeholder="Password" 
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                required 
              />
              <FaLock className="icon-login" />
            </div>

            <div className="remember-forgot">
              <label>
                <input type="checkbox" />I agree to the terms & conditions
              </label>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Signup"}
            </button>

            <div className="register-link">
              <p>
                Already have an account?{" "}
                <a href="#" onClick={loginLink}>
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
