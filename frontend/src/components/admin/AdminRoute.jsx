import { Navigate } from 'react-router-dom';
import { isAdmin } from '../../utils/roleUtils';

/**
 * Component to protect admin-only routes
 * Redirects to home if user is not an admin
 */
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default AdminRoute;
