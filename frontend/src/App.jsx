import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import React from "react";
import Home from "./components/Home";
import Profile from "./components/profile/Profile";
import About from "./components/about/About";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import LoginRegister from "./components/login/LoginRegister";
import { authService } from "./services/authService";

// Protected Route Component
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

  return (
    <div className="App">
      {/* Only show Header & Footer if NOT on login page */}
      {!isLoginPage && <Header />}

      <main>
        <Routes>
          {/* Protected Routes - Require Authentication */}
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
                <div>Contribute Page</div>
              </ProtectedRoute>
            }
          />

          {/* Public Route - Login (ALLOW ACCESS EVEN IF LOGGED IN) */}
          <Route path="/login" element={<LoginRegister />} />

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

      {/* Only show Footer if NOT on login page */}
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
