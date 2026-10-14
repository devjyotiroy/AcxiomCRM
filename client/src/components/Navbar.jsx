import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = ({ pageTitle }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Helper to format role class for badge styling
  const getRoleClass = (role) => {
    if (!role) return '';
    return `role-${role.toLowerCase()}`;
  };

  return (
    <header className="top-header">
      <div className="header-title">
        {pageTitle || 'CRM Portal'}
      </div>

      <div className="header-user">
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className={`role-badge ${getRoleClass(user?.role)}`}>
            {user?.role}
          </span>
        </div>

        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;

