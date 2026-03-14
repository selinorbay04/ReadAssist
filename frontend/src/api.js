import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/**
 * Parse Lambda responses that may have a stringified or parsed body.
 */
export function parseResponse(res, field) {
  if (res.data[field] !== undefined) return res.data[field];
  if (typeof res.data.body === 'string') {
    const parsed = JSON.parse(res.data.body);
    return parsed[field];
  }
  if (res.data.body?.[field] !== undefined) return res.data.body[field];
  throw new Error('Unexpected response format');
}

export async function submitPdf(s3Key, filename) {
  const res = await API.post('/pdf', { s3Key, filename });
  return parseResponse(res, 'docId');
}

export async function getStatus(docId) {
  const res = await API.get(`/status/${docId}`);
  const status = parseResponse(res, 'status');
  let audioUrl = null;
  if (status === 'ready') {
    try {
      audioUrl = parseResponse(res, 'audio_url');
    } catch {
      // audio_url may not be present yet
    }
  }
  return { status, audioUrl };
}

export async function getSummary(docId) {
  const res = await API.get(`/summary/${docId}`);
  return parseResponse(res, 'summary');
}

export async function askQuestion(docId, question) {
  const res = await API.post(`/qa/${docId}`, { question });
  return parseResponse(res, 'answer');
}
