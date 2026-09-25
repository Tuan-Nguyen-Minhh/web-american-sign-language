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
import { isAdmin } from "./utils/roleUtils";

function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Route component that blocks admins from accessing user/public pages
function NonAdminRoute({ children }) {
  const currentUser = authService.getUser();

  // Redirect admins to admin dashboard
  if (isAdmin(currentUser)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Route component that requires a registered user (not guest, not admin)
function ProfileRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();

  if (!isAuthenticated || authService.isGuest()) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin(currentUser)) {
    return <Navigate to="/admin" replace />;
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

  // Check token validity or initialize guest session on app mount
  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPage) return;

      const token = authService.getToken();
      if (!token) {
        // Automatically establish a guest session so camera & websocket work immediately!
        try {
          await authService.guestLogin();
        } catch (err) {
          console.warn("Could not auto-login as guest:", err);
        }
      } else {
        // Verify existing token with backend
        const isValid = await authService.verifyToken();
        if (!isValid) {
          console.log("Token expired or invalid, reverting to guest session...");
          try {
            await authService.guestLogin();
          } catch (err) {}
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
      {!isLoginPage && (
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <NonAdminRoute>
                <Home />
              </NonAdminRoute>
            }
          />
          <Route
            path="/about"
            element={
              <NonAdminRoute>
                <About />
              </NonAdminRoute>
            }
          />
          <Route
            path="/contribute"
            element={
              <NonAdminRoute>
                <Contribute />
              </NonAdminRoute>
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

          <Route
            path="/profile"
            element={
              <ProfileRoute>
                <Profile />
              </ProfileRoute>
            }
          />

          {/* Catch-all route - redirect to home */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
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
