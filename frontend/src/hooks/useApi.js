import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: BASE_URL })

export const uploadDataset       = (file)     => { const f = new FormData(); f.append('file', file); return api.post('/upload', f, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const fetchOverview       = ()         => api.get('/overview')
export const fetchMonitoring     = (params)   => api.get('/monitoring', { params })
export const fetchDefectAnalysis = ()         => api.get('/defect-analysis')
export const fetchDefectBatches  = ()         => api.get('/defect-batches')
export const fetchModelResults   = ()         => api.get('/model-results')
export const fetchClustering     = ()         => api.get('/clustering')
export const fetchHealth         = ()         => api.get('/health')
export const predictSingle       = (features) => api.post('/predict', { features })

export default api
