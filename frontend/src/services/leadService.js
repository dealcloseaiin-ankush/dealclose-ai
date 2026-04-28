import api from './api';

export const getLeads = async () => {
  const { data } = await api.get('/leads');
  return data;
};

export const createLead = async (leadData) => {
  const { data } = await api.post('/leads', leadData);
  return data;
};
