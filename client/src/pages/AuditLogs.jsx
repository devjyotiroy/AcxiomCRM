import React, { useState, useEffect } from 'react';
import { auditLogService } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const fetchLogs = async (searchQuery = search) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityName = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await auditLogService.getAuditLogs(params);
      if (res.success) setLogs(res.data);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(search);
  };

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
    fetchLogs('');
  };

  const openDetails = (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN':
        return 'badge-success';
      case 'FAILED_LOGIN':
        return 'badge-danger';
      case 'CREATE':
        return 'badge-primary';
      case 'UPDATE':
        return 'badge-info';
      case 'DELETE':
        return 'badge-danger';
      case 'STATUS_CHANGE':
        return 'badge-warning';
      case 'UNLOCK':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Audit Logs" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Security & System Audit Logs</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Immutable log of user authentications, record modifications, and role updates.
              </p>
            </div>
          </div>

          {serverError && <div className="alert alert-danger">{serverError}</div>}

          <form onSubmit={handleFilterSubmit} className="filter-bar">
            <input
              type="text"
              placeholder="Search by email, action, entity, record ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="FAILED_LOGIN">FAILED_LOGIN</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="UNLOCK">UNLOCK</option>
              <option value="CONVERT_LEAD">CONVERT_LEAD</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Entities</option>
              <option value="Auth">Auth</option>
              <option value="User">User</option>
              <option value="Customer">Customer</option>
              <option value="Lead">Lead</option>
              <option value="Opportunity">Opportunity</option>
              <option value="FollowUp">FollowUp</option>
              <option value="Activity">Activity</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-select"
              title="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-select"
              title="End Date"
            />

            <button type="submit" className="btn btn-secondary">
              Filter
            </button>
            <button type="button" onClick={handleClearFilters} className="btn btn-secondary">
              Reset
            </button>
          </form>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Email</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record ID</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      No audit log entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdDate || log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.userEmail || log.userId?.email || 'System'}</td>
                      <td>
                        <span className={`badge ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{log.entityName}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {log.recordId || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.ipAddress || '—'}</td>
                      <td>
                        <button
                          onClick={() => openDetails(log)}
                          className="btn btn-secondary btn-sm"
                        >
                          Diff / Data
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {detailModalOpen && selectedLog && (
            <div className="modal-backdrop">
              <div className="modal-box" style={{ maxWidth: '680px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">
                    Audit Log Entry: {selectedLog.action} on {selectedLog.entityName}
                  </h3>
                  <button onClick={() => setDetailModalOpen(false)} className="modal-close">
                    &times;
                  </button>
                </div>
                <div className="modal-body">
                  <div className="detail-row">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">
                      {new Date(selectedLog.createdDate || selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">User:</span>
                    <span className="detail-value">{selectedLog.userEmail || 'System'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">IP Address:</span>
                    <span className="detail-value">{selectedLog.ipAddress || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Record ID:</span>
                    <span className="detail-value">{selectedLog.recordId || '—'}</span>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <strong>Old Value:</strong>
                    <pre
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        fontSize: '0.8rem',
                        marginTop: '4px'
                      }}
                    >
                      {selectedLog.oldValue
                        ? JSON.stringify(selectedLog.oldValue, null, 2)
                        : 'null'}
                    </pre>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <strong>New Value:</strong>
                    <pre
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        fontSize: '0.8rem',
                        marginTop: '4px'
                      }}
                    >
                      {selectedLog.newValue
                        ? JSON.stringify(selectedLog.newValue, null, 2)
                        : 'null'}
                    </pre>
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

export default AuditLogs;

