import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faHands } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { TbLogout } from "react-icons/tb";
import { authService } from "../../services/authService";
import "./header.css"; // Add this import

export default function Header() {
  const handleLogout = () => {
    authService.logout();
  };

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();

  return (
    <header className="header">
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

            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <TbLogout onClick={handleLogout} />
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
