import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faHands } from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";
import { TbLogout } from "react-icons/tb";
import { authService } from "../../services/authService";
import { isAdmin } from "../../utils/roleUtils";
import "./header.css";

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange }) => {
  return (
    <div onClick={() => onChange(!checked)} className="toggle-switch">
      <div
        className="toggle-slider"
        style={{
          left: checked ? "32px" : "2px",
        }}
      />
    </div>
  );
};

export default function Header({ isDarkMode, toggleTheme }) {
  const location = useLocation();
  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();

  // Helper function to check if link is active
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <header
      className="header"
      style={{
        backgroundColor: isDarkMode ? "var(--bg-dark)" : "var(--bg-medium)",
        color: isDarkMode ? "var(--text-primary)" : "var(--text-primary)",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "background-color 0.3s ease",
      }}
    >
      <div className="container">
        <Link to="/" className="link">
          <FontAwesomeIcon icon={faHands} className="fa-icon" />
          <span className="brand-title">Hand Sign Translator</span>
        </Link>
        <nav className="nav">
          <ul>
            {/* Hide Home, About, Contribute for admins */}
            {!isAdmin(currentUser) && (
              <>
                <li>
                  <Link
                    to="/"
                    className={`nav-link ${isActiveLink("/") ? "active" : ""}`}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className={`nav-link ${
                      isActiveLink("/about") ? "active" : ""
                    }`}
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contribute"
                    className={`nav-link ${
                      isActiveLink("/contribute") ? "active" : ""
                    }`}
                  >
                    Contribute
                  </Link>
                </li>
              </>
            )}

            {/* Admin Dashboard Link - Only visible for admins */}
            {isAuthenticated && isAdmin(currentUser) && (
              <li>
                <Link
                  to="/admin"
                  className="nav-link"
                  style={{
                    color: "var(--accent-color)",
                    fontWeight: isActiveLink("/admin") ? "bold" : "normal",
                  }}
                >
                  Admin Dashboard
                </Link>
              </li>
            )}

            <li className="nav-item theme-toggle">
              <ToggleSwitch checked={isDarkMode} onChange={toggleTheme} />
            </li>

            {isAuthenticated ? (
              <>
                {!authService.isGuest() && (
                  <li className="nav-item">
                    <TbLogout
                      onClick={handleLogout}
                      style={{
                        cursor: "pointer",
                        color: "var(--primary-color)",
                      }}
                    />
                  </li>
                )}
                {/* Hide Profile icon for admins */}
                {!isAdmin(currentUser) && (
                  <li className="nav-item">
                    <Link to="/profile" className="nav-link">
                      <FontAwesomeIcon icon={faUser} />
                    </Link>
                  </li>
                )}
              </>
            ) : (
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
