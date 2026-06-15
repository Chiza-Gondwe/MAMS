// api.js - Fixed with proper JWT handling and error responses
const API_BASE = 'http://127.0.0.1:8000/api';

const getToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

const setTokens = (access, refresh) => {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token');
  
  const response = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  });
  
  if (!response.ok) throw new Error('Refresh failed');
  const data = await response.json();
  setTokens(data.access, null);
  return data.access;
};

const request = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const makeRequest = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    return fetch(url, { ...options, headers });
  };
  
  let response = await makeRequest(getToken());
  
  // Token expired - try refresh once
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      response = await makeRequest(newToken);
    } catch (refreshError) {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }
  
  // Handle non-2xx responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { status: response.status, data: errorData, message: errorData.detail || errorData.error || 'Request failed' };
  }
  
  // DELETE requests may return 204 No Content
  if (response.status === 204) return { success: true };
  
  return response.json();
};

export const api = {
  // Auth
  login: (username, password) => request('/token/', { 
    method: 'POST', 
    body: JSON.stringify({ username, password }) 
  }),
  
  // Members
  getMembers: (page = 1, search = '') => request(`/members/?page=${page}&search=${search}`),
  getMember: (id) => request(`/members/${id}/`),
  createMember: (data) => request('/members/', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id, data) => request(`/members/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id) => request(`/members/${id}/`, { method: 'DELETE' }),
  register: (data) => request('/register/', { method: 'POST', body: JSON.stringify(data) }),

  // Add these to your api.js file

// Branches
getBranches: () => request('/branches/'),

// Search user by email (for adding members)
searchUserByEmail: async (email) => {
  // First, try to get users from the system
  // Adjust endpoint based on your actual user endpoint
  try {
    const response = await request(`/users/?search=${email}`);
    if (response.results && response.results.length > 0) {
      const user = response.results[0];
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone
      };
    }
    return null;
  } catch (error) {
    // If users endpoint doesn't exist, try alternative
    console.error('User search failed:', error);
    throw new Error('User not found. Please register this user first.');
  }
},
  
  // Attendance Sessions
  getSessions: (page = 1) => request(`/attendance/sessions/?page=${page}`),
  getSession: (id) => request(`/attendance/sessions/${id}/`),
  createSession: (data) => request('/attendance/sessions/', { 
    method: 'POST', 
    body: JSON.stringify({
      title: data.title,
      session_type: data.session_type,
      date: data.date,
      ...data
    })
  }),
  scanAttendance: (sessionId, memberId) => request(`/attendance/sessions/${sessionId}/scan/`, { 
    method: 'POST', 
    body: JSON.stringify({ member_id: parseInt(memberId) })
  }),
  getAttendanceRecords: (page = 1, sessionId = '') => request(`/attendance/records/?page=${page}${sessionId ? `&session=${sessionId}` : ''}`),
  
  // Announcements
  getAnnouncements: (search = '') => request(`/announcements/?search=${search}`),
  getAnnouncement: (id) => request(`/announcements/${id}/`),
  createAnnouncement: (data) => request('/announcements/', { 
    method: 'POST', 
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      announcement_type: data.type || 'text',
      audience: data.audience || 'all',
      video_url: data.video_url || '',
      created_by: 1 // You might want to get this from the user context
    })
  }),
  updateAnnouncement: (id, data) => request(`/announcements/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/announcements/${id}/`, { method: 'DELETE' }),
};