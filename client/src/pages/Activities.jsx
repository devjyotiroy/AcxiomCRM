import React, { useState, useEffect, useContext } from 'react';
import { activityService, customerService, leadService, opportunityService, userService } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const Activities = () => {
  const { user } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [oppsList, setOppsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    type: 'Call',
    subject: '',
    description: '',
    activityDate: '',
    status: 'Planned',
    relatedType: 'Customer',
    customer: '',
    lead: '',
    opportunity: '',
    assignedTo: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchActivities();
    fetchDropdowns();
  }, [typeFilter, statusFilter]);

  const fetchDropdowns = async () => {
    try {
      const [cRes, lRes, oRes] = await Promise.all([
        customerService.getCustomers(),
        leadService.getLeads(),
        opportunityService.getOpportunities()
      ]);
      if (cRes.success) setCustomersList(cRes.data);
      if (lRes.success) setLeadsList(lRes.data);
      if (oRes.success) setOppsList(oRes.data);

      if (user?.role !== 'SalesExecutive') {
        const uRes = await userService.getUsers();
        if (uRes.success) setUsersList(uRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await activityService.getActivities(params);
      if (res.success) setActivities(res.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch activities.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingActivity(null);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16);

    setFormData({
      type: 'Call',
      subject: '',
      description: '',
      activityDate: dateStr,
      status: 'Planned',
      relatedType: 'Customer',
      customer: customersList[0]?._id || '',
      lead: leadsList[0]?._id || '',
      opportunity: oppsList[0]?._id || '',
      assignedTo: user?._id || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEditModal = (a) => {
    setEditingActivity(a);
    const dateStr = a.activityDate ? new Date(a.activityDate).toISOString().slice(0, 16) : '';
    setFormData({
      type: a.type,
      subject: a.subject,
      description: a.description || '',
      activityDate: dateStr,
      status: a.status,
      relatedType: a.relatedType,
      customer: a.customer?._id || a.customer || '',
      lead: a.lead?._id || a.lead || '',
      opportunity: a.opportunity?._id || a.opportunity || '',
      assignedTo: a.assignedTo?._id || a.assignedTo || ''
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingActivity(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.subject.trim()) errs.subject = 'Subject is required.';
    if (!formData.activityDate) errs.activityDate = 'Date and time are required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setServerError('');
      if (editingActivity) {
        await activityService.updateActivity(editingActivity._id, formData);
        setSuccessMsg('Activity updated successfully.');
      } else {
        await activityService.createActivity(formData);
        setSuccessMsg('Activity logged successfully.');
      }
      closeModal();
      fetchActivities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save activity.');
    }
  };

  const handleDelete = async (id, subject) => {
    if (!window.confirm(`Are you sure you want to delete activity "${subject}"?`)) return;

    try {
      await activityService.deleteActivity(id);
      setSuccessMsg('Activity deleted successfully.');
      fetchActivities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete activity.');
    }
  };

  const getActivityTypeBadge = (type) => {
    switch (type) {
      case 'Call':
        return 'badge-info';
      case 'Meeting':
        return 'badge-primary';
      case 'Email':
        return 'badge-warning';
      case 'Task':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Activities" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Activities Log</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Record and track calls, meetings, client emails, and sales tasks.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn btn-primary">
              + Log Activity
            </button>
          </div>

          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <div className="filter-bar">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Activity Types</option>
              <option value="Call">📞 Call</option>
              <option value="Meeting">🤝 Meeting</option>
              <option value="Email">✉️ Email</option>
              <option value="Task">📋 Task</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Related Record</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading activities...
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      No activity logs found.
                    </td>
                  </tr>
                ) : (
                  activities.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <span className={`badge ${getActivityTypeBadge(a.type)}`}>
                          {a.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.subject}</div>
                        {a.description && (
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {a.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {a.relatedType === 'Customer' && a.customer && (
                          <span>🏢 {a.customer.customerName}</span>
                        )}
                        {a.relatedType === 'Lead' && a.lead && (
                          <span>🎯 {a.lead.leadName}</span>
                        )}
                        {a.relatedType === 'Opportunity' && a.opportunity && (
                          <span>💼 {a.opportunity.title}</span>
                        )}
                      </td>
                      <td>{new Date(a.activityDate).toLocaleString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            a.status === 'Completed'
                              ? 'badge-success'
                              : a.status === 'Cancelled'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>{a.assignedTo?.name || 'Unassigned'}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            onClick={() => openEditModal(a)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(a._id, a.subject)}
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
                    {editingActivity ? 'Edit Activity' : 'Log New Activity'}
                  </h3>
                  <button onClick={closeModal} className="modal-close">
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {serverError && <div className="alert alert-danger">{serverError}</div>}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Activity Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="form-control"
                        >
                          <option value="Call">Call</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Email">Email</option>
                          <option value="Task">Task</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-control"
                        >
                          <option value="Planned">Planned</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                        placeholder="e.g. Discovery Call with CTO"
                      />
                      {errors.subject && <span className="invalid-feedback">{errors.subject}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description / Summary</label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="form-control"
                        placeholder="Discussion notes, action items, or feedback"
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
                          <option value="Opportunity">Opportunity</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Select Record</label>
                        {formData.relatedType === 'Customer' && (
                          <select
                            value={formData.customer}
                            onChange={(e) =>
                              setFormData({ ...formData, customer: e.target.value })
                            }
                            className="form-control"
                          >
                            <option value="">Choose Customer</option>
                            {customersList.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.customerName}
                              </option>
                            ))}
                          </select>
                        )}

                        {formData.relatedType === 'Lead' && (
                          <select
                            value={formData.lead}
                            onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                            className="form-control"
                          >
                            <option value="">Choose Lead</option>
                            {leadsList.map((l) => (
                              <option key={l._id} value={l._id}>
                                {l.leadName}
                              </option>
                            ))}
                          </select>
                        )}

                        {formData.relatedType === 'Opportunity' && (
                          <select
                            value={formData.opportunity}
                            onChange={(e) =>
                              setFormData({ ...formData, opportunity: e.target.value })
                            }
                            className="form-control"
                          >
                            <option value="">Choose Opportunity</option>
                            {oppsList.map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={formData.activityDate}
                          onChange={(e) =>
                            setFormData({ ...formData, activityDate: e.target.value })
                          }
                          className={`form-control ${errors.activityDate ? 'is-invalid' : ''}`}
                        />
                        {errors.activityDate && (
                          <span className="invalid-feedback">{errors.activityDate}</span>
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
                      {editingActivity ? 'Update Activity' : 'Save Activity'}
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

export default Activities;

