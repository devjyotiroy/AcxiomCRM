import React, { useState, useEffect, useContext } from 'react';
import { followUpService, customerService, leadService, userService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const FollowUps = () => {
  const { user } = useContext(AuthContext);
  const [followUps, setFollowUps] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);

  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    followUpDate: '',
    relatedType: 'Customer',
    customer: '',
    lead: '',
    assignedTo: ''
  });
  const [errors, setErrors] = useState({});

  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  useEffect(() => {
    fetchFollowUps();
    fetchDropdowns();
  }, [activeTab]);

  const fetchDropdowns = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        customerService.getCustomers(),
        leadService.getLeads()
      ]);
      if (cRes.success) setCustomersList(cRes.data);
      if (lRes.success) setLeadsList(lRes.data);

      if (user?.role !== 'SalesExecutive') {
        const uRes = await userService.getUsers();
        if (uRes.success) setUsersList(uRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeTab === 'pending') params.filter = 'pending';
      if (activeTab === 'overdue') params.filter = 'overdue';
      if (activeTab === 'completed') params.status = 'Completed';

      const res = await followUpService.getFollowUps(params);
      if (res.success) setFollowUps(res.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    const today = new Date();
    today.setHours(today.getHours() + 2);
    const dateStr = today.toISOString().slice(0, 16);

    setFormData({
      title: '',
      description: '',
      followUpDate: dateStr,
      relatedType: 'Customer',
      customer: customersList[0]?._id || '',
      lead: leadsList[0]?._id || '',
      assignedTo: user?._id || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openRescheduleModal = (f) => {
    setSelectedFollowUp(f);
    const today = new Date();
    today.setDate(today.getDate() + 1);
    setNewRescheduleDate(today.toISOString().slice(0, 16));
    setRescheduleError('');
    setRescheduleModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required.';
    if (!formData.followUpDate) {
      errs.followUpDate = 'Follow-up date cannot be earlier than today.';
    } else {
      const scheduled = new Date(formData.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduled < today) {
        errs.followUpDate = 'Follow-up date cannot be earlier than today.';
      }
    }

    if (formData.relatedType === 'Customer' && !formData.customer) {
      errs.customer = 'Please select a customer.';
    }
    if (formData.relatedType === 'Lead' && !formData.lead) {
      errs.lead = 'Please select a lead.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setServerError('');
      await followUpService.createFollowUp(formData);
      setSuccessMsg('Follow-up scheduled successfully.');
      setModalOpen(false);
      fetchFollowUps();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to schedule follow-up.');
    }
  };

  const handleComplete = async (id) => {
    try {
      await followUpService.completeFollowUp(id);
      setSuccessMsg('Follow-up marked as completed.');
      fetchFollowUps();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete follow-up.');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newRescheduleDate) {
      setRescheduleError('New follow-up date is required.');
      return;
    }

    const scheduled = new Date(newRescheduleDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduled < today) {
      setRescheduleError('Follow-up date cannot be earlier than today.');
      return;
    }

    try {
      await followUpService.rescheduleFollowUp(selectedFollowUp._id, { newDate: newRescheduleDate });
      setSuccessMsg('Follow-up rescheduled successfully.');
      setRescheduleModalOpen(false);
      fetchFollowUps();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete follow-up "${title}"?`)) return;

    try {
      await followUpService.deleteFollowUp(id);
      setSuccessMsg('Follow-up deleted successfully.');
      fetchFollowUps();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete follow-up.');
    }
  };

  const isOverdue = (f) => {
    return f.status === 'Pending' && new Date(f.followUpDate) < new Date();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Follow-Ups" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Follow-Ups & Reminders</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Schedule calls and client meetings, monitor pending and overdue items.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + Schedule Follow-Up
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Upcoming Pending
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`btn btn-sm ${activeTab === 'overdue' ? 'btn-danger' : 'btn-secondary'}`}
            >
              ⚠️ Overdue
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`btn btn-sm ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Completed
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Related To</th>
                  <th>Scheduled Date & Time</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading follow-ups...
                    </td>
                  </tr>
                ) : followUps.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                      No follow-up records found.
                    </td>
                  </tr>
                ) : (
                  followUps.map((f) => {
                    const overdue = isOverdue(f);

                    return (
                      <tr key={f._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{f.title}</div>
                          {f.description && (
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {f.description}
                            </div>
                          )}
                        </td>
                        <td>
                          {f.relatedType === 'Customer' ? (
                            <span>
                              🏢 {f.customer?.customerName || 'Customer'} (
                              {f.customer?.customerCode || '—'})
                            </span>
                          ) : (
                            <span>
                              🎯 {f.lead?.leadName || 'Lead'} ({f.lead?.leadCode || '—'})
                            </span>
                          )}
                        </td>
                        <td>
                          <div>{new Date(f.followUpDate).toLocaleString()}</div>
                          {overdue && (
                            <span className="badge badge-danger" style={{ marginTop: '4px' }}>
                              Overdue
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              f.status === 'Completed'
                                ? 'badge-success'
                                : overdue
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td>{f.assignedTo?.name || 'Unassigned'}</td>
                        <td>
                          <div className="actions-cell">
                            {f.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleComplete(f._id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: '#16a34a' }}
                                >
                                  ✓ Done
                                </button>
                                <button
                                  onClick={() => openRescheduleModal(f)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Reschedule
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(f._id, f.title)}
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
                  <h3 className="modal-title">Schedule Follow-Up</h3>
                  <button onClick={() => setModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-group">
                      <label className="form-label">Follow-Up Title / Purpose</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                        placeholder="e.g. Product Demo Call, Contract Discussion"
                      />
                      {errors.title && <span className="invalid-feedback">{errors.title}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notes / Description</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-control"
                        placeholder="Agenda or specific questions to discuss"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Related Record Type</label>
                        <select
                          value={formData.relatedType}
                          onChange={(e) =>
                            setFormData({ ...formData, relatedType: e.target.value })
                          }
                          className="form-control"
                        >
                          <option value="Customer">Customer</option>
                          <option value="Lead">Lead</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Select {formData.relatedType}
                        </label>
                        {formData.relatedType === 'Customer' ? (
                          <select
                            value={formData.customer}
                            onChange={(e) =>
                              setFormData({ ...formData, customer: e.target.value })
                            }
                            className={`form-control ${errors.customer ? 'is-invalid' : ''}`}
                          >
                            <option value="">Choose Customer</option>
                            {customersList.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.customerName} ({c.customerCode})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={formData.lead}
                            onChange={(e) =>
                              setFormData({ ...formData, lead: e.target.value })
                            }
                            className={`form-control ${errors.lead ? 'is-invalid' : ''}`}
                          >
                            <option value="">Choose Lead</option>
                            {leadsList.map((l) => (
                              <option key={l._id} value={l._id}>
                                {l.leadName} ({l.leadCode})
                              </option>
                            ))}
                          </select>
                        )}
                        {(errors.customer || errors.lead) && (
                          <span className="invalid-feedback">
                            {errors.customer || errors.lead}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={formData.followUpDate}
                          onChange={(e) =>
                            setFormData({ ...formData, followUpDate: e.target.value })
                          }
                          className={`form-control ${errors.followUpDate ? 'is-invalid' : ''}`}
                        />
                        {errors.followUpDate && (
                          <span className="invalid-feedback">{errors.followUpDate}</span>
                        )}
                      </div>

                      {user?.role !== 'SalesExecutive' && (
                        <div className="form-group">
                          <label className="form-label">Assignee</label>
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
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Schedule Follow-Up
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {rescheduleModalOpen && selectedFollowUp && (
            <div className="modal-backdrop">
              <div className="modal-box">
                <div className="modal-header">
                  <h3 className="modal-title">Reschedule: {selectedFollowUp.title}</h3>
                  <button
                    onClick={() => setRescheduleModalOpen(false)}
                    className="modal-close"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleRescheduleSubmit}>
                  <div className="modal-body">
                    {rescheduleError && (
                      <div className="alert alert-danger">{rescheduleError}</div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Select New Date & Time</label>
                      <input
                        type="datetime-local"
                        value={newRescheduleDate}
                        onChange={(e) => setNewRescheduleDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      onClick={() => setRescheduleModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Confirm Reschedule
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

export default FollowUps;

