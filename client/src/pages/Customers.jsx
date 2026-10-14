import React, { useState, useEffect } from 'react';
import { customerService } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    status: 'Active'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const fetchCustomers = async (searchQuery = search) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await customerService.getCustomers(params);
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      customerCode: '',
      customerName: '',
      email: '',
      phone: '',
      companyName: '',
      address: '',
      city: '',
      state: '',
      status: 'Active'
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setFormData({
      customerCode: c.customerCode,
      customerName: c.customerName,
      email: c.email,
      phone: c.phone,
      companyName: c.companyName || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      status: c.status || 'Active'
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openDetails = (c) => {
    setSelectedCustomer(c);
    setDetailModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.customerName.trim()) {
      errs.customerName = 'Customer name is required.';
    } else if (formData.customerName.trim().length > 100) {
      errs.customerName = 'Customer name cannot exceed 100 characters.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Enter a valid email address.';
      }
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errs.phone = 'Enter a valid 10-digit Indian phone number (starts with 6-9).';
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
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer._id, formData);
        setSuccessMsg('Customer updated successfully.');
      } else {
        await customerService.createCustomer(formData);
        setSuccessMsg('Customer created successfully.');
      }
      closeModal();
      fetchCustomers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save customer.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      await customerService.deleteCustomer(id);
      setSuccessMsg('Customer deleted successfully.');
      fetchCustomers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Customers" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Customers</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Manage verified CRM customer records and contacts.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + Add Customer
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <form onSubmit={handleSearchSubmit} className="filter-bar">
            <input
              type="text"
              placeholder="Search by name, email, phone, company, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchCustomers('');
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
            )}
          </form>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>City / State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{c.customerCode}</td>
                      <td style={{ fontWeight: 600 }}>{c.customerName}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.companyName || '—'}</td>
                      <td>
                        {c.city || c.state ? `${c.city || ''}${c.city && c.state ? ', ' : ''}${c.state || ''}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button onClick={() => openDetails(c)} className="btn btn-secondary btn-sm">
                            View
                          </button>
                          <button onClick={() => openEditModal(c)} className="btn btn-secondary btn-sm">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(c._id, c.customerName)} className="btn btn-danger btn-sm">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {modalOpen && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
                  <button onClick={closeModal} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <input
                          type="text"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          className={`form-control ${errors.customerName ? 'is-invalid' : ''}`}
                          placeholder="e.g. Acme Corporation"
                        />
                        {errors.customerName && <span className="invalid-feedback">{errors.customerName}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="form-control"
                          placeholder="e.g. Acme Ltd"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          placeholder="contact@acme.com"
                        />
                        {errors.email && <span className="invalid-feedback">{errors.email}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone (10 Digits)</label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                          placeholder="9876543210"
                        />
                        {errors.phone && <span className="invalid-feedback">{errors.phone}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="form-control"
                        placeholder="123 Business Way, Phase 2"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="form-control"
                          placeholder="Mumbai"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">State</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="form-control"
                          placeholder="Maharashtra"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="form-control"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingCustomer ? 'Update Customer' : 'Save Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {detailModalOpen && selectedCustomer && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">Customer Details - {selectedCustomer.customerCode}</h3>
                  <button onClick={() => setDetailModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <div className="detail-row">
                    <span className="detail-label">Code:</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#2563eb' }}>
                      {selectedCustomer.customerCode}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedCustomer.customerName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedCustomer.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedCustomer.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{selectedCustomer.companyName || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedCustomer.address || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">City / State:</span>
                    <span className="detail-value">
                      {selectedCustomer.city || selectedCustomer.state
                        ? `${selectedCustomer.city || ''}, ${selectedCustomer.state || ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      <span
                        className={`badge ${
                          selectedCustomer.status === 'Active' ? 'badge-success' : 'badge-secondary'
                        }`}
                      >
                        {selectedCustomer.status}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created By:</span>
                    <span className="detail-value">{selectedCustomer.createdBy?.name || 'System'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created Date:</span>
                    <span className="detail-value">
                      {new Date(selectedCustomer.createdDate || selectedCustomer.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button onClick={() => setDetailModalOpen(false)} className="btn btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Customers;

