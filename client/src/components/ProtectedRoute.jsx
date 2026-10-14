import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// it checks if user is authenticated and authorized by role
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  // it wil show loading screen while checking the authenticatuon
  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <h3>Loading AcxiomCRM...</h3>
      </div>
    );
  }

  // if user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // if role check fails, block access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p style={{ marginTop: '10px', color: '#6b7280' }}>
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

