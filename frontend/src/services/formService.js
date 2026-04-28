import api from './api';

export const getForms = async () => {
  const { data } = await api.get('/forms');
  return data;
};
