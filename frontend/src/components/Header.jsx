import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faHands } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };
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
              <Link to="/contact" className="nav-link">
                Contact
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                Logout
              </button>
            </li>
            <li>
              <Link to="/account" className="nav-link">
                <FontAwesomeIcon icon={faUser} />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
