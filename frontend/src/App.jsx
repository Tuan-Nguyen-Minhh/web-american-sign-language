import Header from "./components/Header";
import Footer from "./components/footer/Footer";
import React from "react";
import Home from "./components/Home";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import LoginRegister from "./components/login/LoginRegister";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="App">
      {/* Only show Header & Footer if NOT on login page */}
      {!isLoginPage && <Header />}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<div>About Page</div>} />
          <Route path="/contact" element={<div>Contact Page</div>} />
          <Route path="/login" element={<LoginRegister />} />
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
