import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        Acxiom<span>CRM</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          📊 Dashboard
        </NavLink>

        <div className="nav-section-title">Sales & CRM</div>

        <NavLink
          to="/customers"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          👥 Customers
        </NavLink>

        <NavLink
          to="/leads"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          🎯 Leads
        </NavLink>

        <NavLink
          to="/opportunities"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          💼 Opportunities
        </NavLink>

        <NavLink
          to="/follow-ups"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          ⏰ Follow-Ups
        </NavLink>

        <NavLink
          to="/activities"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          📝 Activities
        </NavLink>

        {/* Admin Only Section */}
        {user?.role === 'Admin' && (
          <>
            <div className="nav-section-title">Administration</div>
            <NavLink
              to="/users"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              🔐 User Management
            </NavLink>

            <NavLink
              to="/audit-logs"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              📜 Audit Logs
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;

