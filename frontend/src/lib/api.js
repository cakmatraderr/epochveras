import axios from 'axios';

const http = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

export const api = {
  proxy: (path, params) => http.get(`/binance/${path}`, { params }).then((r) => r.data),
  drawings: (symbol) => http.get('/drawings', { params: { symbol } }).then((r) => r.data),
  saveDrawing: (d) => http.put(`/drawings/${d.id}`, d).then((r) => r.data),
  deleteDrawing: (id) => http.delete(`/drawings/${id}`),
  clearDrawings: (symbol) => http.delete('/drawings', { params: { symbol } }),
  alerts: () => http.get('/alerts').then((r) => r.data),
  createAlert: (a) => http.post('/alerts', a).then((r) => r.data),
  patchAlert: (id, p) => http.patch(`/alerts/${id}`, p).then((r) => r.data),
  deleteAlert: (id) => http.delete(`/alerts/${id}`),
  getSetting: (key) => http.get(`/settings/${key}`).then((r) => r.data.value),
  putSetting: (key, value) => http.put(`/settings/${key}`, { value }),
};
