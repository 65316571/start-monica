const API_URL = '/api';

const request = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
    list: (tagType) => {
        let url = `${API_URL}/tags`;
        if (tagType) url += `?tag_type=${tagType}`;
        return request(url);
    },
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
  },
  images: {
    list: (params) => {
        let url = `${API_URL}/images`;
        if (params) {
            const query = new URLSearchParams(params).toString();
            url += `?${query}`;
        }
        return request(url);
    },
    upload: (file, eventId) => {
        const formData = new FormData();
        formData.append('file', file);
        if (eventId) formData.append('eventId', eventId);
        return request(`${API_URL}/images/upload`, { method: 'POST', body: formData });
    },
    delete: (id) => request(`${API_URL}/images/${id}`, { method: 'DELETE' }),
    rename: (id, filename) => request(`${API_URL}/images/${id}/rename`, { method: 'PUT', body: JSON.stringify({ filename }) }),
    getTags: () => request(`${API_URL}/images/tags`),
    createTag: (name, color) => request(`${API_URL}/images/tags`, { method: 'POST', body: JSON.stringify({ name, color }) }),
    addTag: (id, tagId) => request(`${API_URL}/images/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    removeTag: (id, tagId) => request(`${API_URL}/images/${id}/tags/${tagId}`, { method: 'DELETE' }),
    batchDelete: (ids) => request(`${API_URL}/images/batch/delete`, { method: 'POST', body: JSON.stringify({ ids }) }),
    batchAddTag: (ids, tagId) => request(`${API_URL}/images/batch/tags`, { method: 'POST', body: JSON.stringify({ ids, tagId }) }),
    linkToEvent: (id, eventId) => request(`${API_URL}/images/${id}/link-event`, { method: 'POST', body: JSON.stringify({ eventId }) }),
    unlinkFromEvent: (id) => request(`${API_URL}/images/${id}/unlink-event`, { method: 'POST' }),
  }
};
