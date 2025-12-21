import React from 'react';
import { authService } from '../../services/authService';
import './GuestRestriction.css';

/**
 * Component that blocks guest users from accessing certain features
 * Shows a message prompting them to login/register
 */
const GuestRestriction = ({ children, feature = "this feature" }) => {
  const isGuest = authService.isGuest();

  if (isGuest) {
    return (
      <div className="guest-restriction-overlay">
        <div className="guest-restriction-message">
          <div className="guest-icon">🔒</div>
          <h2>Authentication Required</h2>
          <p>
            You need to <strong>login</strong> or <strong>register</strong> to use {feature}.
          </p>
          <p className="guest-note">
            Guest users can view other parts of the application, but cannot use detection or save history.
          </p>
          <div className="guest-actions">
            <button
              className="btn-login"
              onClick={() => {
                authService.logout();
              }}
            >
              Login / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GuestRestriction;
