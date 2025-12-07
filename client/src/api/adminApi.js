import axiosClient from './axiosClient';

export const adminApi = {
  // ----- Users -----
  async getUsers(role) {
    const res = await axiosClient.get('/admin/users', {
      params: role ? { role } : {},
    });
    return res.data;
  },

  async createUser(payload) {
    // payload: { name, email, role, password? }
    const res = await axiosClient.post('/admin/users', payload);
    return res.data;
  },

  async updateUser(userId, updates) {
    const res = await axiosClient.put(`/admin/users/${userId}`, updates);
    return res.data;
  },

  async deleteUser(userId) {
  const res = await axiosClient.delete(`/admin/users/${userId}`);
  return res.data;
},

  // ----- Societies -----
  async getSocieties() {
    const res = await axiosClient.get('/admin/societies');
    return res.data;
  },

  async createSociety(payload) {
    // { name, description }
    const res = await axiosClient.post('/admin/societies', payload);
    return res.data;
  },

  async updateSociety(societyId, updates) {
    const res = await axiosClient.put(`/admin/societies/${societyId}`, updates);
    return res.data;
  },

  async getCoreMembers(societyId) {
    const res = await axiosClient.get(
      `/admin/societies/${societyId}/core-members`
    );
    return res.data;
  },

  async addCoreMember(societyId, payload) {
  // payload: { user_id, role_name }
  const res = await axiosClient.post(
    `/admin/societies/${societyId}/core-members`,
    payload
  );
  return res.data;
},

  async updateCoreMember(societyId, membershipId, updates) {
    const res = await axiosClient.put(
      `/admin/societies/${societyId}/core-members/${membershipId}`,
      updates
    );
    return res.data;
  },

  // ----- Global Events -----
  async getEvents() {
    const res = await axiosClient.get('/admin/events');
    return res.data;
  },

  // ----- Global Certificates -----
  async getCertificates() {
    const res = await axiosClient.get('/admin/certificates');
    return res.data;
  },

  // ----- Logs -----
  async getLogs(limit = 50) {
    const res = await axiosClient.get('/admin/logs', { params: { limit } });
    return res.data;
  },

    // ----- Society Admins -----
  async getSocietyAdmins() {
    const res = await axiosClient.get('/admin/society-admins');
    return res.data;
  },

  async deleteCoreMember(societyId, membershipId) {
  const res = await axiosClient.delete(
    `/admin/societies/${societyId}/core-members/${membershipId}`
  );
  return res.data;
},

async deleteSociety(societyId) {
  const res = await axiosClient.delete(`/admin/societies/${societyId}`);
  return res.data;
},

async getOverview() {
    const res = await axiosClient.get('/admin/overview');
    return res.data;
  },
};




