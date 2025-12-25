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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import apiService from "../../services/apiService";
import GuestRestriction from "../guest/GuestRestriction";
import "./profile.css";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [speakingSessionId, setSpeakingSessionId] = useState(null);

  // Text-to-Speech function
  const speakDetections = (detections, sessionId) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support text-to-speech");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Build speech text from all detections
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
        // STEP 1: Load cached data immediately (Fast UX)
        const cachedUser = authService.getUser();

        if (!cachedUser) {
          // Not logged in - redirect
          navigate("/login");
          return;
        }

        // Show cached data immediately
        setUser({
          name: cachedUser.name,
          email: cachedUser.email,
          id: cachedUser.id,
          joinDate: cachedUser.created_at || new Date().toISOString(),
          totalDetections: 0,
        });
        setLoading(false); // Remove loading spinner

        // STEP 2: Fetch fresh data in background
        await refreshUserData(false); // Don't show loading spinner
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

      // Skip data fetching for guest users
      if (authService.isGuest()) {
        setRefreshing(false);
        return;
      }

      // Fetch fresh user data from backend
      const freshUser = await apiService.getCurrentUser();

      console.log("Fresh user data:", freshUser);
      console.log(
        "Total detection sessions:",
        freshUser.total_detection_sessions
      );

      // Update state with fresh data
      setUser((prevUser) => ({
        ...prevUser,
        name: freshUser.name,
        email: freshUser.email,
        id: freshUser.id,
        joinDate: freshUser.created_at || prevUser.joinDate,
        totalDetections: freshUser.total_detection_sessions || 0, // Total sessions (saved or not)
      }));

      // Update localStorage cache
      authService.updateUserCache({
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        created_at: freshUser.created_at,
      });

      // Fetch detection history from database
      const history = await apiService.request("/detection-history/", {
        method: "GET",
      });
      setDetectionHistory(history);

      // Don't override totalDetections - it should come from freshUser.total_detection_sessions

      setError(null);
    } catch (err) {
      console.error("Error refreshing data:", err);
      // Don't show error if we have cached data
      if (!user) {
        setError("Failed to refresh profile data");
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this detection session?")
    ) {
      try {
        // Optimistic update - remove from UI immediately
        setDetectionHistory((prev) => prev.filter((item) => item.id !== id));

        // Call backend to actually delete
        await apiService.request(`/detection-history/${id}`, {
          method: "DELETE",
        });

        alert("Detection history deleted successfully!");
      } catch (error) {
        console.error("Error deleting detection:", error);
        // Revert on error - refresh the list
        alert("Failed to delete detection. Please try again.");
        refreshUserData(false);
      }
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

  // Initial loading state (only on first load)
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

  // Error state (only if no cached data available)
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

      {/* Show refresh indicator */}
      {refreshing && (
        <div className="refresh-indicator">
          <FaSync className="spinning" />
          Updating profile data...
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Guest Info Banner */}
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

      {/* History Section - Restricted for guests */}
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
                      onClick={() => handleDelete(item.id)}
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
