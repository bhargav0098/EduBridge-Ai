import api from './api';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    name: string,
    role: 'student' | 'teacher'
  ) => {
    const response = await api.post('/register', {
      email,
      password,
      name,
      role,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
};
