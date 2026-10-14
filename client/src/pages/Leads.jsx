import React, { useState, useEffect, useContext } from 'react';
import { leadService, userService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const validTransitions = {
  New: ['Contacted', 'Unqualified', 'Lost'],
  Contacted: ['Qualified', 'Unqualified', 'Lost'],
  Qualified: ['Converted', 'Lost'],
  Unqualified: ['Contacted'],
  Lost: ['Contacted'],
  Converted: []
};

const Leads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    leadName: '',
    email: '',
    phone: '',
    companyName: '',
    source: 'Website',
    status: 'New',
    expectedValue: 0,
    assignedTo: ''
  });
  const [errors, setErrors] = useState({});

  const [convertData, setConvertData] = useState({
    createOpportunity: false,
    opportunityTitle: '',
    amount: 0,
    probability: 20,
    expectedCloseDate: ''
  });
  const [convertErrors, setConvertErrors] = useState({});

  useEffect(() => {
    fetchLeads();
    if (user?.role !== 'SalesExecutive') {
      fetchUsers();
    }
  }, [statusFilter, assignedFilter]);

  const fetchUsers = async () => {
    try {
      const res = await userService.getUsers();
      if (res.success) setUsersList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async (searchQuery = search) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;
      if (assignedFilter) params.assignedTo = assignedFilter;

      const res = await leadService.getLeads(params);
      if (res.success) setLeads(res.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads(search);
  };

  const openCreateModal = () => {
    setEditingLead(null);
    setFormData({
      leadName: '',
      email: '',
      phone: '',
      companyName: '',
      source: 'Website',
      status: 'New',
      expectedValue: 0,
      assignedTo: user?._id || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEditModal = (l) => {
    setEditingLead(l);
    setFormData({
      leadName: l.leadName,
      email: l.email,
      phone: l.phone,
      companyName: l.companyName || '',
      source: l.source || 'Website',
      status: l.status,
      expectedValue: l.expectedValue || 0,
      assignedTo: l.assignedTo?._id || l.assignedTo || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openConvertModal = (l) => {
    setConvertingLead(l);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    const dateStr = tomorrow.toISOString().split('T')[0];

    setConvertData({
      createOpportunity: true,
      opportunityTitle: `${l.leadName} - Deal`,
      amount: l.expectedValue || 50000,
      probability: 30,
      expectedCloseDate: dateStr
    });
    setConvertErrors({});
    setServerError('');
    setConvertModalOpen(true);
  };

  const openDetails = (l) => {
    setSelectedLead(l);
    setDetailModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLead(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.leadName.trim()) errs.leadName = 'Lead name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) errs.email = 'Enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (formData.expectedValue < 0) {
      errs.expectedValue = 'Expected value cannot be negative.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setServerError('');
      if (editingLead) {
        await leadService.updateLead(editingLead._id, formData);
        setSuccessMsg('Lead updated successfully.');
      } else {
        await leadService.createLead(formData);
        setSuccessMsg('Lead created successfully.');
      }
      closeModal();
      fetchLeads();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save lead.');
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (convertData.createOpportunity) {
      if (!convertData.opportunityTitle.trim()) errs.opportunityTitle = 'Deal title is required.';
      if (convertData.amount <= 0) errs.amount = 'Opportunity Amount must be greater than 0.';
      if (convertData.probability < 0 || convertData.probability > 100) errs.probability = 'Probability must be between 0 and 100.';
      if (!convertData.expectedCloseDate) {
        errs.expectedCloseDate = 'Expected Close Date cannot be in the past.';
      } else {
        const close = new Date(convertData.expectedCloseDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (close < today) errs.expectedCloseDate = 'Expected Close Date cannot be in the past.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setConvertErrors(errs);
      return;
    }

    try {
      setServerError('');
      await leadService.convertLead(convertingLead._id, convertData);
      setSuccessMsg('Lead converted to Customer and Opportunity successfully.');
      setConvertModalOpen(false);
      fetchLeads();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Conversion failed.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete lead "${name}"?`)) return;

    try {
      await leadService.deleteLead(id);
      setSuccessMsg('Lead deleted successfully.');
      fetchLeads();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lead.');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'New':
        return 'badge-primary';
      case 'Contacted':
        return 'badge-info';
      case 'Qualified':
        return 'badge-warning';
      case 'Converted':
        return 'badge-success';
      case 'Unqualified':
        return 'badge-secondary';
      case 'Lost':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const getAllowedTransitions = (curr) => {
    return [curr, ...(validTransitions[curr] || [])];
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Leads" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Leads Pipeline</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Capture prospects, track qualification stages, and convert to deals.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + Add Lead
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <form onSubmit={handleSearchSubmit} className="filter-bar">
            <input
              type="text"
              placeholder="Search by lead name, company, email, phone, or code..."
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
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Unqualified">Unqualified</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>

            {user?.role !== 'SalesExecutive' && (
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Assignees</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            )}

            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchLeads('');
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
                  <th>Lead Name</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Expected (₹)</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr key={l._id}>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{l.leadCode}</td>
                      <td style={{ fontWeight: 600 }}>{l.leadName}</td>
                      <td>
                        <div>{l.email}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{l.phone}</div>
                      </td>
                      <td>{l.companyName || '—'}</td>
                      <td>{l.source}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(l.status)}`}>{l.status}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{Number(l.expectedValue || 0).toLocaleString('en-IN')}</td>
                      <td>{l.assignedTo?.name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button onClick={() => openDetails(l)} className="btn btn-secondary btn-sm">
                            View
                          </button>
                          {l.status !== 'Converted' && (
                            <>
                              <button onClick={() => openEditModal(l)} className="btn btn-secondary btn-sm">
                                Edit
                              </button>
                              <button onClick={() => openConvertModal(l)} className="btn btn-primary btn-sm">
                                Convert
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(l._id, l.leadName)} className="btn btn-danger btn-sm">
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
                  <h3 className="modal-title">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h3>
                  <button onClick={closeModal} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Lead Name</label>
                        <input
                          type="text"
                          value={formData.leadName}
                          onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                          className={`form-control ${errors.leadName ? 'is-invalid' : ''}`}
                          placeholder="e.g. Rahul Sharma"
                        />
                        {errors.leadName && <span className="invalid-feedback">{errors.leadName}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="form-control"
                          placeholder="e.g. Infosys Ltd"
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
                          placeholder="rahul@infosys.com"
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

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Lead Source</label>
                        <select
                          value={formData.source}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          className="form-control"
                        >
                          <option value="Website">Website</option>
                          <option value="Referral">Referral</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Email Campaign">Email Campaign</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-control"
                        >
                          {editingLead
                            ? getAllowedTransitions(editingLead.status).map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))
                            : ['New', 'Contacted', 'Qualified', 'Unqualified', 'Lost'].map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Expected Value (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.expectedValue}
                          onChange={(e) =>
                            setFormData({ ...formData, expectedValue: Number(e.target.value) })
                          }
                          className={`form-control ${errors.expectedValue ? 'is-invalid' : ''}`}
                        />
                        {errors.expectedValue && (
                          <span className="invalid-feedback">{errors.expectedValue}</span>
                        )}
                      </div>

                      {user?.role !== 'SalesExecutive' && (
                        <div className="form-group">
                          <label className="form-label">Assign To User</label>
                          <select
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="form-control"
                          >
                            <option value="">Select Sales Member</option>
                            {usersList.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingLead ? 'Update Lead' : 'Save Lead'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {convertModalOpen && convertingLead && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">Convert Lead: {convertingLead.leadName}</h3>
                  <button onClick={() => setConvertModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleConvertSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <strong>Automatic Customer Creation:</strong>
                      <p style={{ marginTop: '4px', color: '#166534' }}>
                        Converting this lead will automatically create a verified Customer account for{' '}
                        <strong>{convertingLead.leadName}</strong> ({convertingLead.email}).
                      </p>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={convertData.createOpportunity}
                          onChange={(e) =>
                            setConvertData({ ...convertData, createOpportunity: e.target.checked })
                          }
                        />
                        <span style={{ fontWeight: 600 }}>Create an Opportunity (Deal) for this Customer</span>
                      </label>
                    </div>

                    {convertData.createOpportunity && (
                      <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div className="form-group">
                          <label className="form-label">Deal / Opportunity Title</label>
                          <input
                            type="text"
                            value={convertData.opportunityTitle}
                            onChange={(e) =>
                              setConvertData({ ...convertData, opportunityTitle: e.target.value })
                            }
                            className={`form-control ${convertErrors.opportunityTitle ? 'is-invalid' : ''}`}
                          />
                          {convertErrors.opportunityTitle && (
                            <span className="invalid-feedback">{convertErrors.opportunityTitle}</span>
                          )}
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Deal Amount (₹)</label>
                            <input
                              type="number"
                              min="1"
                              value={convertData.amount}
                              onChange={(e) =>
                                setConvertData({ ...convertData, amount: Number(e.target.value) })
                              }
                              className={`form-control ${convertErrors.amount ? 'is-invalid' : ''}`}
                            />
                            {convertErrors.amount && (
                              <span className="invalid-feedback">{convertErrors.amount}</span>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="form-label">Probability (0-100%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={convertData.probability}
                              onChange={(e) =>
                                setConvertData({ ...convertData, probability: Number(e.target.value) })
                              }
                              className={`form-control ${convertErrors.probability ? 'is-invalid' : ''}`}
                            />
                            {convertErrors.probability && (
                              <span className="invalid-feedback">{convertErrors.probability}</span>
                            )}
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Expected Close Date</label>
                          <input
                            type="date"
                            value={convertData.expectedCloseDate}
                            onChange={(e) =>
                              setConvertData({ ...convertData, expectedCloseDate: e.target.value })
                            }
                            className={`form-control ${convertErrors.expectedCloseDate ? 'is-invalid' : ''}`}
                          />
                          {convertErrors.expectedCloseDate && (
                            <span className="invalid-feedback">{convertErrors.expectedCloseDate}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      onClick={() => setConvertModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Confirm Conversion
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {detailModalOpen && selectedLead && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">Lead Details - {selectedLead.leadCode}</h3>
                  <button onClick={() => setDetailModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <div className="detail-row">
                    <span className="detail-label">Lead Code:</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#2563eb' }}>
                      {selectedLead.leadCode}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedLead.leadName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedLead.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedLead.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{selectedLead.companyName || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Source:</span>
                    <span className="detail-value">{selectedLead.source}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      <span className={`badge ${getStatusBadge(selectedLead.status)}`}>
                        {selectedLead.status}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Expected Value:</span>
                    <span className="detail-value" style={{ fontWeight: 600 }}>
                      ₹{Number(selectedLead.expectedValue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Assigned To:</span>
                    <span className="detail-value">{selectedLead.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                  {selectedLead.convertedCustomerId && (
                    <div className="detail-row">
                      <span className="detail-label">Converted Customer:</span>
                      <span className="detail-value" style={{ color: '#16a34a', fontWeight: 600 }}>
                        {selectedLead.convertedCustomerId.customerName} (
                        {selectedLead.convertedCustomerId.customerCode})
                      </span>
                    </div>
                  )}
                  {selectedLead.convertedOpportunityId && (
                    <div className="detail-row">
                      <span className="detail-label">Converted Deal:</span>
                      <span className="detail-value" style={{ color: '#2563eb', fontWeight: 600 }}>
                        {selectedLead.convertedOpportunityId.title} (
                        {selectedLead.convertedOpportunityId.opportunityCode})
                      </span>
                    </div>
                  )}
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

export default Leads;

