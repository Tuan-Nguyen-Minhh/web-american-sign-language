import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaHistory,
  FaTrash,
  FaPlay,
  FaDownload,
  FaSignOutAlt,
  FaCalendar,
  FaHandPaper,
  FaSync,
  FaVolumeUp,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import apiService from "../../services/apiService";
import GuestRestriction from "../guest/GuestRestriction";
import "./profile.css";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{type === "success" ? "✓" : "✕"}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ session, onConfirm, onCancel }) => {
  return (
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div
        className="delete-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <FaExclamationTriangle />
        </div>
        <h2>Delete Detection Session?</h2>
        <p className="delete-modal-session-name">
          "{session.session_name || `Session ${session.id}`}"
        </p>
        <p className="delete-modal-warning">
          This action cannot be undone. All detection data from this session
          will be permanently deleted.
        </p>
        <div className="delete-modal-stats">
          <span>
            <strong>{session.total_detections}</strong> detections
          </span>
          <span>•</span>
          <span>
            Created {new Date(session.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="delete-modal-actions">
          <button className="btn-modal-delete" onClick={onConfirm}>
            <FaTrash /> Delete Session
          </button>
          <button className="btn-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [speakingSessionId, setSpeakingSessionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // For delete confirmation
  const [toast, setToast] = useState(null);

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Text-to-Speech function
  const speakDetections = (detections, sessionId) => {
    if (!("speechSynthesis" in window)) {
      showToast("Your browser does not support text-to-speech", "error");
      return;
    }

    window.speechSynthesis.cancel();

    const speechText = detections
      .map(
        (det) =>
          `${det.word} with ${Math.round(
            det.confidence * 100
          )} percent confidence`
      )
      .join(", ");

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = "en-US";

    utterance.onstart = () => setSpeakingSessionId(sessionId);
    utterance.onend = () => setSpeakingSessionId(null);
    utterance.onerror = () => setSpeakingSessionId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Fetch user data with hybrid approach
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const cachedUser = authService.getUser();

        if (!cachedUser) {
          navigate("/login");
          return;
        }

        setUser({
          name: cachedUser.name,
          email: cachedUser.email,
          id: cachedUser.id,
          joinDate: cachedUser.created_at || new Date().toISOString(),
          totalDetections: 0,
        });
        setLoading(false);

        await refreshUserData(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile");
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  // Refresh user data from backend
  const refreshUserData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setRefreshing(true);
      }

      if (authService.isGuest()) {
        setRefreshing(false);
        return;
      }

      const freshUser = await apiService.getCurrentUser();

      setUser((prevUser) => ({
        ...prevUser,
        name: freshUser.name,
        email: freshUser.email,
        id: freshUser.id,
        joinDate: freshUser.created_at || prevUser.joinDate,
        totalDetections: freshUser.total_detection_sessions || 0,
      }));

      authService.updateUserCache({
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        created_at: freshUser.created_at,
      });

      const history = await apiService.request("/detection-history/", {
        method: "GET",
      });
      setDetectionHistory(history);

      setError(null);
    } catch (err) {
      console.error("Error refreshing data:", err);
      if (!user) {
        setError("Failed to refresh profile data");
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      // Optimistic update
      setDetectionHistory((prev) =>
        prev.filter((item) => item.id !== deleteTarget.id)
      );
      setDeleteTarget(null);

      // Call backend
      await apiService.request(`/detection-history/${deleteTarget.id}`, {
        method: "DELETE",
      });

      showToast("Detection session deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting detection:", error);
      showToast("Failed to delete detection. Please try again.", "error");
      refreshUserData(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <p className="error-text">{error}</p>
          <button className="retry-btn" onClick={() => refreshUserData(true)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          session={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header Section */}
      <div className="profile-header">
        <div className="header-content">
          <div className="avatar-section">
            <div className="avatar">
              <FaUser className="avatar-icon" />
            </div>
            <div className="user-info">
              <h1 className="user-name">{user.name}</h1>
              <p className="user-email">{user.email}</p>
              <p className="join-date">
                <FaCalendar className="icon-small" />
                Member since {formatDate(user.joinDate)}
              </p>
            </div>
          </div>
          {!authService.isGuest() && (
            <div className="header-actions">
              <button
                className="refresh-btn"
                onClick={() => refreshUserData(true)}
                disabled={refreshing}
                title="Refresh profile data"
              >
                <FaSync
                  className={`btn-icon ${refreshing ? "spinning" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt className="btn-icon" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {refreshing && (
        <div className="refresh-indicator">
          <FaSync className="spinning" />
          Updating profile data...
        </div>
      )}

      {!authService.isGuest() && (
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">
              <FaHandPaper />
            </div>
            <div className="stat-info">
              <h3 className="stat-number">{user.totalDetections}</h3>
              <p className="stat-label">Total Detection Sessions</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaHistory />
            </div>
            <div className="stat-info">
              <h3 className="stat-number">{detectionHistory.length}</h3>
              <p className="stat-label">Saved Sessions</p>
            </div>
          </div>
        </div>
      )}

      {authService.isGuest() && (
        <div className="guest-info-banner">
          <p>
            You're browsing as a guest.{" "}
            <span
              className="guest-action-link"
              onClick={handleLogout}
              role="button"
              tabIndex={0}
            >
              Login or register
            </span>{" "}
            to use detection and save your progress!
          </p>
        </div>
      )}

      <GuestRestriction feature="detection history">
        <div className="history-section">
          <div className="section-header">
            <h2 className="section-title">
              <FaHistory className="icon-medium" />
              Detection History
            </h2>
            <p className="section-subtitle">
              View and manage your saved ASL detection sessions
            </p>
          </div>

          {detectionHistory.length === 0 ? (
            <div className="empty-state">
              <FaHandPaper className="empty-icon" />
              <p className="empty-text">No detection history yet</p>
              <p className="empty-subtext">
                Start detecting ASL gestures and save your sessions!
              </p>
            </div>
          ) : (
            <div className="history-grid">
              {detectionHistory.map((item) => (
                <div key={item.id} className="history-card">
                  <div className="card-header">
                    <div className="session-info">
                      <h3 className="session-name">
                        {item.session_name || `Session ${item.id}`}
                      </h3>
                      <span className="session-date">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => setDeleteTarget(item)}
                      title="Delete session"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">Total Detections:</span>
                      <span className="value">{item.total_detections}</span>
                    </div>
                    <div className="detections-preview">
                      <span className="label">Detected Gestures:</span>
                      <div className="gesture-list">
                        {item.detections.slice(0, 3).map((det, idx) => (
                          <span key={idx} className="gesture-badge">
                            {det.word} ({Math.round(det.confidence * 100)}%)
                          </span>
                        ))}
                        {item.detections.length > 3 && (
                          <span className="more-badge">
                            +{item.detections.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button
                      className="action-btn play-btn"
                      onClick={() => speakDetections(item.detections, item.id)}
                      disabled={speakingSessionId === item.id}
                    >
                      <FaVolumeUp className="btn-icon" />
                      {speakingSessionId === item.id
                        ? "Speaking..."
                        : "Play Audio"}
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => setSelectedVideo(item)}
                    >
                      <FaPlay className="btn-icon" />
                      View Details
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => {
                        const logText = item.detections
                          .map(
                            (d) =>
                              `${d.word} (${Math.round(d.confidence * 100)}%)`
                          )
                          .join("\n");
                        const element = document.createElement("a");
                        const file = new Blob([logText], {
                          type: "text/plain",
                        });
                        element.href = URL.createObjectURL(file);
                        element.download = `detection_${item.id}_${new Date(
                          item.created_at
                        ).toLocaleDateString()}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                    >
                      <FaDownload className="btn-icon" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GuestRestriction>

      {/* Details Modal */}
      {selectedVideo && (
        <div className="modal" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedVideo.session_name || `Session ${selectedVideo.id}`}
              </h3>
              <button
                className="close-btn"
                onClick={() => setSelectedVideo(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-info-row">
                <strong>Date:</strong> {formatDate(selectedVideo.created_at)}
              </div>
              <div className="modal-info-row">
                <strong>Total Detections:</strong>{" "}
                {selectedVideo.total_detections}
              </div>
              <div className="modal-detections">
                <h4>All Detected Gestures:</h4>
                <div className="detection-items">
                  {selectedVideo.detections.map((det, idx) => (
                    <div key={idx} className="detection-row">
                      <span className="detection-word">{det.word}</span>
                      <span className="detection-confidence">
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
