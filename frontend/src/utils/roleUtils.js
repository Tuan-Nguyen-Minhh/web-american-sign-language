// Role-based access control utilities

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

/**
 * Check if user has a specific role
 */
export const hasRole = (user, role) => {
  return user?.role === role;
};

/**
 * Check if user is an admin
 */
export const isAdmin = (user) => {
  return hasRole(user, USER_ROLES.ADMIN);
};

/**
 * Check if user is a regular user
 */
export const isRegularUser = (user) => {
  return hasRole(user, USER_ROLES.USER);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user, roles) => {
  return roles.includes(user?.role);
};
