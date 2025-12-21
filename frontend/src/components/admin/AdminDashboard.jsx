import { useState, useEffect } from 'react';
import { apiClient } from '../../utils/apiClient';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersResponse = await apiClient('/api/admin/users', {
        method: 'GET'
      });
      
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const usersData = await usersResponse.json();
      setUsers(usersData);
      
      // Fetch statistics
      const statsResponse = await apiClient('/api/admin/statistics', {
        method: 'GET'
      });
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const statsData = await statsResponse.json();
      setStatistics(statsData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user ${userName}?`)) {
      return;
    }
    
    try {
      const response = await apiClient(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete user');
      }
      
      // Refresh data
      fetchData();
      alert(`User ${userName} deleted successfully`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleChangeRole = async (userId, currentRole, userName) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!confirm(`Change ${userName}'s role from ${currentRole} to ${newRole}?`)) {
      return;
    }
    
    try {
      const response = await apiClient(`/api/admin/users/${userId}/role?role=${newRole}`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update role');
      }
      
      // Refresh data
      fetchData();
      alert(`User ${userName} role updated to ${newRole}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleViewHistory = async (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
    setShowHistoryModal(true);
    setHistoryLoading(true);
    
    try {
      const response = await apiClient(`/api/admin/users/${userId}/detection-history`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch detection history');
      }
      
      const data = await response.json();
      setUserHistory(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
      setUserHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedUser(null);
    setUserHistory([]);
  };

  if (loading) {
    return <div className="admin-dashboard loading">Loading...</div>;
  }

  if (error) {
    return <div className="admin-dashboard error">Error: {error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {/* Statistics Section */}
      {statistics && (
        <div className="statistics-section">
          <h2>System Statistics</h2>
          <div className="stats-grid">
            <div className="admin-stat-card">
              <h3>Total Users</h3>
              <p className="stat-value">{statistics.total_users}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Admins</h3>
              <p className="stat-value">{statistics.total_admins}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Regular Users</h3>
              <p className="stat-value">{statistics.total_regular_users}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Detection Histories</h3>
              <p className="stat-value">{statistics.total_detection_histories}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Users Table Section */}
      <div className="users-section">
        <h2>All Users</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Sessions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.total_detection_sessions}</td>
                <td className="actions">
                  <button
                    className="btn-view-history"
                    onClick={() => handleViewHistory(user.id, user.name)}
                  >
                    View History
                  </button>
                  <button
                    className="btn-change-role"
                    onClick={() => handleChangeRole(user.id, user.role, user.name)}
                  >
                    Change Role
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteUser(user.id, user.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detection History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detection History - {selectedUser?.name}</h2>
              <button className="close-button" onClick={closeHistoryModal}>×</button>
            </div>
            
            <div className="modal-body">
              {historyLoading ? (
                <div className="loading">Loading history...</div>
              ) : userHistory.length === 0 ? (
                <div className="no-history">No detection history found for this user.</div>
              ) : (
                <div className="history-list">
                  {userHistory.map((history) => (
                    <div key={history.id} className="history-item">
                      <div className="history-header">
                        <h3>{history.session_name || `Session ${history.id}`}</h3>
                        <div className="history-meta">
                          <span className="history-date">
                            {new Date(history.created_at).toLocaleString()}
                          </span>
                          <span className="history-count">
                            {history.total_detections} detections
                          </span>
                        </div>
                      </div>
                      <div className="detections-list">
                        {history.detections.map((detection, idx) => (
                          <div key={idx} className="detection-item">
                            <span className="detection-word">{detection.word}</span>
                            <span className="detection-confidence">
                              {(detection.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
