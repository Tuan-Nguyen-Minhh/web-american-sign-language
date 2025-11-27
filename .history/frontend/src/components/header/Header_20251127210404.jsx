import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faHands } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { TbLogout } from "react-icons/tb";
import { authService } from "../../services/authService";
import "./header.css"; 

export default function Header({ isDarkMode, toggleTheme }) {
  const handleLogout = () => {
    // Để đảm bảo chuyển hướng khi logout
    authService.logout();
    window.location.href = "/login"; 
  };

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();

  return (
    // Áp dụng style dynamic cho header
    <header className="header" style={{
        backgroundColor: isDarkMode ? 'var(--bg-dark)' : 'var(--bg-medium)',
        color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.3s ease'
    }}>
      <div className="container">
        <Link to="/" className="link">
          <FontAwesomeIcon icon={faHands} className="fa-icon" />
          <span className="brand-title">Hand Sign Translator</span>
        </Link>
        <nav className="nav">
          <ul>
            <li>
              <Link to="/" className="nav-link">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="nav-link">
                About
              </Link>
            </li>
            <li>
              <Link to="/contribute" className="nav-link">
                Contribute
              </Link>
            </li>

            {/* 2. NÚT CHUYỂN ĐỔI DARK MODE (Dùng thẻ <a> để đồng bộ style) */}
            <li className="nav-item">
              <a // Thay thế button bằng <a> để đồng bộ style với các link khác
                onClick={toggleTheme}
                className="nav-link"
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  // Đảm bảo thẳng hàng
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              >
                {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
              </a>
            </li>

            {/* 3. PHẦN AUTHENTICATION (Giữ nguyên) */}
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <TbLogout onClick={handleLogout} style={{cursor: 'pointer', color: 'var(--primary-color)'}} />
                </li>
                <li className="nav-item">
                  <Link to="/profile" className="nav-link">
                    <FontAwesomeIcon icon={faUser} />
                  </Link>
                </li>
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