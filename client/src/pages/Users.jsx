import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'SalesExecutive',
    isActive: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'SalesExecutive',
      isActive: true
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role: u.role,
      isActive: u.isActive
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) errs.email = 'Enter a valid email address.';
    }

    if (!editingUser) {
      if (!formData.password) {
        errs.password = 'Password is required.';
      } else {
        const hasMinLength = formData.password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
          errs.password = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number.';
        }
      }
    } else if (formData.password) {
      const hasMinLength = formData.password.length >= 8;
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasNumber = /[0-9]/.test(formData.password);
      if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
        errs.password = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setServerError('');
      if (editingUser) {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          isActive: formData.isActive
        };
        if (formData.password) payload.password = formData.password;
        await userService.updateUser(editingUser._id, payload);
        setSuccessMsg('User updated successfully.');
      } else {
        await userService.createUser(formData);
        setSuccessMsg('User created successfully.');
      }
      closeModal();
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await userService.toggleStatus(id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change status.');
    }
  };

  const handleUnlock = async (id) => {
    try {
      await userService.unlockUser(id);
      setSuccessMsg('Account unlocked successfully.');
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unlock user.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      await userService.deleteUser(id);
      setSuccessMsg('User deleted successfully.');
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const isUserLocked = (u) => {
    return u.lockUntil && new Date(u.lockUntil) > new Date();
  };

  const getLockoutMinutes = (u) => {
    if (!isUserLocked(u)) return 0;
    return Math.ceil((new Date(u.lockUntil) - new Date()) / (60 * 1000));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="User Management" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">User & Role Management</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Create, update, activate/deactivate CRM users and assign roles.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + Add New User
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Security / Lockout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const locked = isUserLocked(u);
                    const mins = getLockoutMinutes(u);

                    return (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.role === 'Admin'
                                ? 'badge-danger'
                                : u.role === 'Manager'
                                ? 'badge-warning'
                                : 'badge-primary'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-success' : 'badge-secondary'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {locked ? (
                            <span className="badge badge-danger">
                              Locked ({mins}m)
                            </span>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                              Normal ({u.failedLoginAttempts || 0} failed)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              onClick={() => openEditModal(u)}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u._id)}
                              className="btn btn-secondary btn-sm"
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            {locked && (
                              <button
                                onClick={() => handleUnlock(u._id)}
                                className="btn btn-primary btn-sm"
                              >
                                Unlock
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(u._id, u.name)}
                              className="btn btn-danger btn-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {modalOpen && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  <button onClick={closeModal} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="John Doe"
                      />
                      {errors.name && <span className="invalid-feedback">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="john@acxiom.com"
                      />
                      {errors.email && <span className="invalid-feedback">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="form-control"
                        placeholder="9876543210"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="form-control"
                        >
                          <option value="SalesExecutive">Sales Executive</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>

                      {editingUser && (
                        <div className="form-group">
                          <label className="form-label">Account Status</label>
                          <select
                            value={formData.isActive}
                            onChange={(e) =>
                              setFormData({ ...formData, isActive: e.target.value === 'true' })
                            }
                            className="form-control"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder={editingUser ? 'Enter new password if changing' : 'Min 8 chars, A-Z, a-z, 0-9'}
                      />
                      {errors.password && (
                        <span className="invalid-feedback">{errors.password}</span>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingUser ? 'Save Changes' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Users;

