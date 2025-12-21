import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import React, { useState, useEffect } from "react";
import About from "./components/about/About";
import Home from "./components/Home";
import Profile from "./components/profile/Profile";
import Contribute from "./components/contribute/Contribute";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminRoute from "./components/admin/AdminRoute";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import LoginRegister from "./components/login/LoginRegister";
import { authService } from "./services/authService";

function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  // Check token validity on app mount
  useEffect(() => {
    const checkAuth = async () => {
      // Skip check if on login page
      if (isLoginPage) return;
      
      const token = authService.getToken();
      if (token) {
        // Verify token with backend
        const isValid = await authService.verifyToken();
        if (!isValid) {
          console.log('Token expired or invalid, redirecting to login...');
        }
      }
    };

    checkAuth();
  }, [isLoginPage]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // 3. Hàm toggle để truyền xuống Header
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };
  // ---------------------------------------------

  return (
    <div className="App">
      {/* Only show Header if NOT on login page */}
      {/* [CẬP NHẬT]: Truyền props isDarkMode và toggleTheme cho Header */}
      {!isLoginPage && (
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contribute"
            element={
              <ProtectedRoute>
                <Contribute />
              </ProtectedRoute>
            }
          />

          {/* Public Route - Login (ALLOW ACCESS EVEN IF LOGGED IN) */}
          <Route path="/login" element={<LoginRegister />} />

          {/* Admin-only Route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Catch-all route - redirect to home or login */}
          <Route
            path="*"
            element={
              authService.isAuthenticated() ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {!isLoginPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
