import React, { useState, useEffect, useContext } from 'react';
import { opportunityService, customerService, userService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const Opportunities = () => {
  const { user } = useContext(AuthContext);
  const [opportunities, setOpportunities] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    customer: '',
    stage: 'Qualification',
    amount: 10000,
    probability: 20,
    expectedCloseDate: '',
    assignedTo: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchOpportunities();
    fetchDropdowns();
  }, [stageFilter, customerFilter]);

  const fetchDropdowns = async () => {
    try {
      const custRes = await customerService.getCustomers();
      if (custRes.success) setCustomersList(custRes.data);

      if (user?.role !== 'SalesExecutive') {
        const userRes = await userService.getUsers();
        if (userRes.success) setUsersList(userRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOpportunities = async (searchQuery = search) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (stageFilter) params.stage = stageFilter;
      if (customerFilter) params.customer = customerFilter;

      const res = await opportunityService.getOpportunities(params);
      if (res.success) setOpportunities(res.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities(search);
  };

  const openCreateModal = () => {
    setEditingOpp(null);
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    const dateStr = inTwoWeeks.toISOString().split('T')[0];

    setFormData({
      title: '',
      customer: customersList[0]?._id || '',
      stage: 'Qualification',
      amount: 50000,
      probability: 20,
      expectedCloseDate: dateStr,
      assignedTo: user?._id || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEditModal = (opp) => {
    setEditingOpp(opp);
    const dateStr = opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split('T')[0] : '';
    setFormData({
      title: opp.title,
      customer: opp.customer?._id || opp.customer || '',
      stage: opp.stage,
      amount: opp.amount,
      probability: opp.probability,
      expectedCloseDate: dateStr,
      assignedTo: opp.assignedTo?._id || opp.assignedTo || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openDetails = (opp) => {
    setSelectedOpp(opp);
    setDetailModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOpp(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Opportunity title is required.';
    if (!formData.customer) errs.customer = 'Please select a customer.';

    const numAmount = Number(formData.amount);
    const numProb = Number(formData.probability);
    const isActive = ['Qualification', 'Proposal', 'Negotiation'].includes(formData.stage);

    if (isNaN(numProb) || numProb < 0 || numProb > 100) {
      errs.probability = 'Probability must be between 0 and 100.';
    }

    if (isActive && (isNaN(numAmount) || numAmount <= 0)) {
      errs.amount = 'Opportunity Amount must be greater than 0.';
    }

    if (!formData.expectedCloseDate) {
      errs.expectedCloseDate = 'Expected Close Date cannot be in the past.';
    } else if (isActive) {
      const close = new Date(formData.expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (close < today) {
        errs.expectedCloseDate = 'Expected Close Date cannot be in the past.';
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
      if (editingOpp) {
        await opportunityService.updateOpportunity(editingOpp._id, formData);
        setSuccessMsg('Opportunity updated successfully.');
      } else {
        await opportunityService.createOpportunity(formData);
        setSuccessMsg('Opportunity created successfully.');
      }
      closeModal();
      fetchOpportunities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save opportunity.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete opportunity "${title}"?`)) return;

    try {
      await opportunityService.deleteOpportunity(id);
      setSuccessMsg('Opportunity deleted successfully.');
      fetchOpportunities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete opportunity.');
    }
  };

  const getStageBadge = (st) => {
    switch (st) {
      case 'Qualification':
        return 'badge-primary';
      case 'Proposal':
        return 'badge-info';
      case 'Negotiation':
        return 'badge-warning';
      case 'Won':
        return 'badge-success';
      case 'Lost':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const currentWeighted = Number(
    ((Number(formData.amount || 0) * Number(formData.probability || 0)) / 100).toFixed(2)
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Opportunities" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Opportunities Pipeline</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Track active deal stages, closing probabilities, and weighted forecast values.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + New Opportunity
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <form onSubmit={handleSearchSubmit} className="filter-bar">
            <input
              type="text"
              placeholder="Search by title or opportunity code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Stages</option>
              <option value="Qualification">Qualification</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>

            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Customers</option>
              {customersList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customerName}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchOpportunities('');
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
                  <th>Title</th>
                  <th>Customer</th>
                  <th>Stage</th>
                  <th>Deal Amount</th>
                  <th>Probability</th>
                  <th>Weighted Value</th>
                  <th>Expected Close</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading opportunities...
                    </td>
                  </tr>
                ) : opportunities.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px' }}>
                      No opportunities found.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <tr key={opp._id}>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{opp.opportunityCode}</td>
                      <td style={{ fontWeight: 600 }}>{opp.title}</td>
                      <td>{opp.customer?.customerName || '—'}</td>
                      <td>
                        <span className={`badge ${getStageBadge(opp.stage)}`}>{opp.stage}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{Number(opp.amount).toLocaleString('en-IN')}</td>
                      <td>{opp.probability}%</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>
                        ₹{Number(opp.weightedAmount).toLocaleString('en-IN')}
                      </td>
                      <td>
                        {opp.expectedCloseDate
                          ? new Date(opp.expectedCloseDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>{opp.assignedTo?.name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button onClick={() => openDetails(opp)} className="btn btn-secondary btn-sm">
                            View
                          </button>
                          <button onClick={() => openEditModal(opp)} className="btn btn-secondary btn-sm">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(opp._id, opp.title)}
                            className="btn btn-danger btn-sm"
                          >
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
                  <h3 className="modal-title">
                    {editingOpp ? 'Edit Opportunity' : 'New Opportunity'}
                  </h3>
                  <button onClick={closeModal} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-group">
                      <label className="form-label">Deal / Opportunity Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                        placeholder="e.g. Enterprise CRM License"
                      />
                      {errors.title && <span className="invalid-feedback">{errors.title}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Customer</label>
                        <select
                          value={formData.customer}
                          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                          className={`form-control ${errors.customer ? 'is-invalid' : ''}`}
                        >
                          <option value="">Select Customer</option>
                          {customersList.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.customerName} ({c.customerCode})
                            </option>
                          ))}
                        </select>
                        {errors.customer && (
                          <span className="invalid-feedback">{errors.customer}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Pipeline Stage</label>
                        <select
                          value={formData.stage}
                          onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                          className="form-control"
                        >
                          <option value="Qualification">Qualification</option>
                          <option value="Proposal">Proposal</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Deal Amount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: Number(e.target.value) })
                          }
                          className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                        />
                        {errors.amount && <span className="invalid-feedback">{errors.amount}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Probability (0 - 100%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.probability}
                          onChange={(e) =>
                            setFormData({ ...formData, probability: Number(e.target.value) })
                          }
                          className={`form-control ${errors.probability ? 'is-invalid' : ''}`}
                        />
                        {errors.probability && (
                          <span className="invalid-feedback">{errors.probability}</span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                        Weighted Pipeline Forecast (Amount × Probability / 100):
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                        ₹{currentWeighted.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Expected Close Date</label>
                        <input
                          type="date"
                          value={formData.expectedCloseDate}
                          onChange={(e) =>
                            setFormData({ ...formData, expectedCloseDate: e.target.value })
                          }
                          className={`form-control ${errors.expectedCloseDate ? 'is-invalid' : ''}`}
                        />
                        {errors.expectedCloseDate && (
                          <span className="invalid-feedback">{errors.expectedCloseDate}</span>
                        )}
                      </div>

                      {user?.role !== 'SalesExecutive' && (
                        <div className="form-group">
                          <label className="form-label">Owner</label>
                          <select
                            value={formData.assignedTo}
                            onChange={(e) =>
                              setFormData({ ...formData, assignedTo: e.target.value })
                            }
                            className="form-control"
                          >
                            <option value="">Select Assignee</option>
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
                      {editingOpp ? 'Save Changes' : 'Create Opportunity'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {detailModalOpen && selectedOpp && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">Opportunity - {selectedOpp.opportunityCode}</h3>
                  <button onClick={() => setDetailModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <div className="detail-row">
                    <span className="detail-label">Code:</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#2563eb' }}>
                      {selectedOpp.opportunityCode}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Title:</span>
                    <span className="detail-value">{selectedOpp.title}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Customer:</span>
                    <span className="detail-value">
                      {selectedOpp.customer?.customerName} ({selectedOpp.customer?.customerCode})
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Stage:</span>
                    <span className="detail-value">
                      <span className={`badge ${getStageBadge(selectedOpp.stage)}`}>
                        {selectedOpp.stage}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value" style={{ fontWeight: 600 }}>
                      ₹{Number(selectedOpp.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Probability:</span>
                    <span className="detail-value">{selectedOpp.probability}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Weighted Value:</span>
                    <span className="detail-value" style={{ color: '#16a34a', fontWeight: 700 }}>
                      ₹{Number(selectedOpp.weightedAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Close Date:</span>
                    <span className="detail-value">
                      {selectedOpp.expectedCloseDate
                        ? new Date(selectedOpp.expectedCloseDate).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Owner:</span>
                    <span className="detail-value">{selectedOpp.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created By:</span>
                    <span className="detail-value">{selectedOpp.createdBy?.name || 'System'}</span>
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

export default Opportunities;

