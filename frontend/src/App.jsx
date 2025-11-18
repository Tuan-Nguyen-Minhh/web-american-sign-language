import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import React from "react";
import Home from "./components/Home";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import LoginRegister from "./components/login/LoginRegister";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function AppContent() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const isLoginPage = location.pathname === "/login";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {/* Only show Header & Footer if NOT on login page */}
      {!isLoginPage && <Header />}

      <main>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginRegister />
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/about" element={
            <ProtectedRoute>
              <div>About Page</div>
            </ProtectedRoute>
          } />
          <Route path="/contact" element={
            <ProtectedRoute>
              <div>Contact Page</div>
            </ProtectedRoute>
          } />
          {/* Redirect any unknown route to home if authenticated, login if not */}
          <Route path="*" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
          } />
        </Routes>
      </main>

      {/* Only show Footer if NOT on login page */}
      {!isLoginPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
