import api from './api';

export const getCalls = async () => {
  const { data } = await api.get('/calls');
  return data;
};

export const dialCall = (phoneNumber, leadId) => api.post('/calls/dial', { phoneNumber, leadId });
