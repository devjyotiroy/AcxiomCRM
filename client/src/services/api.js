import axios from 'axios';

// create an Axios instance with base URL and cookie credentials enabled
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json'
  }
});

// authentication API calls
export const authService = {
  // register a new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // logout user
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // get current loggedin user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const userService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  createUser: async (data) => {
    const response = await api.post('/users', data);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  toggleStatus: async (id) => {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  },
  unlockUser: async (id) => {
    const response = await api.patch(`/users/${id}/unlock`);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const customerService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },
  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },
  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },
  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  }
};

export const leadService = {
  getLeads: async (params = {}) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },
  getLead: async (id) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },
  createLead: async (data) => {
    const response = await api.post('/leads', data);
    return response.data;
  },
  updateLead: async (id, data) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
  },
  convertLead: async (id, data) => {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data;
  },
  deleteLead: async (id) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  }
};

export const opportunityService = {
  getOpportunities: async (params = {}) => {
    const response = await api.get('/opportunities', { params });
    return response.data;
  },
  getOpportunity: async (id) => {
    const response = await api.get(`/opportunities/${id}`);
    return response.data;
  },
  createOpportunity: async (data) => {
    const response = await api.post('/opportunities', data);
    return response.data;
  },
  updateOpportunity: async (id, data) => {
    const response = await api.put(`/opportunities/${id}`, data);
    return response.data;
  },
  deleteOpportunity: async (id) => {
    const response = await api.delete(`/opportunities/${id}`);
    return response.data;
  }
};

export const followUpService = {
  getFollowUps: async (params = {}) => {
    const response = await api.get('/follow-ups', { params });
    return response.data;
  },
  getFollowUp: async (id) => {
    const response = await api.get(`/follow-ups/${id}`);
    return response.data;
  },
  createFollowUp: async (data) => {
    const response = await api.post('/follow-ups', data);
    return response.data;
  },
  updateFollowUp: async (id, data) => {
    const response = await api.put(`/follow-ups/${id}`, data);
    return response.data;
  },
  completeFollowUp: async (id) => {
    const response = await api.patch(`/follow-ups/${id}/complete`);
    return response.data;
  },
  rescheduleFollowUp: async (id, data) => {
    const response = await api.patch(`/follow-ups/${id}/reschedule`, data);
    return response.data;
  },
  deleteFollowUp: async (id) => {
    const response = await api.delete(`/follow-ups/${id}`);
    return response.data;
  }
};

export const activityService = {
  getActivities: async (params = {}) => {
    const response = await api.get('/activities', { params });
    return response.data;
  },
  getActivity: async (id) => {
    const response = await api.get(`/activities/${id}`);
    return response.data;
  },
  createActivity: async (data) => {
    const response = await api.post('/activities', data);
    return response.data;
  },
  updateActivity: async (id, data) => {
    const response = await api.put(`/activities/${id}`, data);
    return response.data;
  },
  deleteActivity: async (id) => {
    const response = await api.delete(`/activities/${id}`);
    return response.data;
  }
};

export const auditLogService = {
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  }
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

export default api;

