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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import apiService from "../../services/apiService";
import "./profile.css";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

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

      // Fetch fresh user data from backend
      const freshUser = await apiService.getCurrentUser();

      // Update state with fresh data
      setUser((prevUser) => ({
        ...prevUser,
        name: freshUser.name,
        email: freshUser.email,
        id: freshUser.id,
        joinDate: freshUser.created_at || prevUser.joinDate,
        totalDetections: freshUser.blogs?.length || 0, // Example: count blogs
      }));

      // Update localStorage cache
      authService.updateUserCache({
        id: freshUser.id,
        name: freshUser.name,
        email: freshUser.email,
        created_at: freshUser.created_at,
      });

      // Fetch detection history
      // const history = await apiService.getDetectionHistory();
      // setDetectionHistory(history);

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
    if (window.confirm("Are you sure you want to delete this detection?")) {
      try {
        // Optimistic update - remove from UI immediately
        setDetectionHistory((prev) => prev.filter((item) => item.id !== id));

        // Call backend to actually delete
        // await apiService.deleteDetection(id);
      } catch (error) {
        console.error("Error deleting detection:", error);
        // Revert on error
        alert("Failed to delete detection. Please try again.");
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      authService.logout();
      navigate("/login");
    }
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
          <div className="header-actions">
            <button
              className="refresh-btn"
              onClick={() => refreshUserData(true)}
              disabled={refreshing}
              title="Refresh profile data"
            >
              <FaSync className={`btn-icon ${refreshing ? "spinning" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt className="btn-icon" />
              Logout
            </button>
          </div>
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
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">
            <FaHandPaper />
          </div>
          <div className="stat-info">
            <h3 className="stat-number">{user.totalDetections}</h3>
            <p className="stat-label">Total Detections</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaHistory />
          </div>
          <div className="stat-info">
            <h3 className="stat-number">{detectionHistory.length}</h3>
            <p className="stat-label">Saved History</p>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="history-section">
        <div className="section-header">
          <h2 className="section-title">
            <FaHistory className="icon-medium" />
            Detection History
          </h2>
          <p className="section-subtitle">
            View and manage your saved ASL detections
          </p>
        </div>

        {detectionHistory.length === 0 ? (
          <div className="empty-state">
            <FaHandPaper className="empty-icon" />
            <p className="empty-text">No detection history yet</p>
            <p className="empty-subtext">
              Start translating ASL and save your detections!
            </p>
          </div>
        ) : (
          <div className="history-grid">
            {detectionHistory.map((item) => (
              <div key={item.id} className="history-card">
                <div className="card-header">
                  <div className="letter-badge">
                    <span className="letter">{item.letter}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(item.id)}
                  >
                    <FaTrash />
                  </button>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(item.date)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Time:</span>
                    <span className="value">{item.time}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Confidence:</span>
                    <span className="confidence-badge">{item.confidence}%</span>
                  </div>
                </div>

                <div className="card-footer">
                  <button
                    className="action-btn"
                    onClick={() => setSelectedVideo(item)}
                  >
                    <FaPlay className="btn-icon" />
                    Play Video
                  </button>
                  <button className="action-btn">
                    <FaDownload className="btn-icon" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="modal" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detection: {selectedVideo.letter}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedVideo(null)}
              >
                ✕
              </button>
            </div>
            <div className="video-container">
              <p className="video-placeholder">
                Video Player
                <br />
                (Integrate your video player here)
              </p>
            </div>
            <div className="modal-footer">
              <p className="modal-info">
                Detected on {formatDate(selectedVideo.date)} at{" "}
                {selectedVideo.time}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
