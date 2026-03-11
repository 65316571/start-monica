const API_URL = '/api';

const request = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    // Check if response has content
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    
    if (!res.ok) {
      return { data: null, error: new Error((data && data.error) || res.statusText) };
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const api = {
  people: {
    list: () => request(`${API_URL}/people`),
    get: (id) => request(`${API_URL}/people/${id}`),
    create: (data) => request(`${API_URL}/people`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`${API_URL}/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`${API_URL}/people/${id}`, { method: 'DELETE' }),
  },
  events: {
    list: () => request(`${API_URL}/events`),
    get: (id) => request(`${API_URL}/events/${id}`),
    create: (data) => request(`${API_URL}/events`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`${API_URL}/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`${API_URL}/events/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => request(`${API_URL}/tags`),
    create: (data) => request(`${API_URL}/tags`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`${API_URL}/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`${API_URL}/tags/${id}`, { method: 'DELETE' }),
  },
  personTags: {
    list: (personId) => {
        let url = `${API_URL}/person_tags`;
        if (personId) url += `?person_id=${personId}`;
        return request(url);
    },
    create: (data) => request(`${API_URL}/person_tags`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (personId) => request(`${API_URL}/person_tags?person_id=${personId}`, { method: 'DELETE' }),
  },
  eventParticipants: {
    list: (eventId, personId) => {
        let url = `${API_URL}/event_participants?`;
        if (eventId) url += `event_id=${eventId}`;
        if (personId) url += `&person_id=${personId}`;
        return request(url);
    },
    create: (data) => request(`${API_URL}/event_participants`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (eventId) => request(`${API_URL}/event_participants?event_id=${eventId}`, { method: 'DELETE' }),
  },
  relationships: {
    list: (params) => {
        let url = `${API_URL}/relationships`;
        if (params) {
            const query = new URLSearchParams(params).toString();
            url += `?${query}`;
        }
        return request(url);
    },
    create: (data) => request(`${API_URL}/relationships`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`${API_URL}/relationships/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  data: {
    clear: () => request(`${API_URL}/data/clear`, { method: 'POST' }),
    export: () => request(`${API_URL}/data/export`),
    import: (data) => request(`${API_URL}/data/import`, { method: 'POST', body: JSON.stringify(data) }),
  }
};
