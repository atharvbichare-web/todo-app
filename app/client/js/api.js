const API_URL = 'http://localhost:5000/api';

const api = {
  // Tasks
  async getTasks(filterDate = '') {
    try {
      const url = filterDate ? `${API_URL}/tasks?date=${filterDate}` : `${API_URL}/tasks`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      localStorage.setItem('cached_tasks', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error('Offline or fetch failed, using cache:', err);
      const cached = localStorage.getItem('cached_tasks');
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addTask(task) {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Add task failed:', err);
      return null;
    }
  },

  async updateTask(id, updates) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Update task failed:', err);
      return null;
    }
  },

  async deleteTask(id) {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  // Routines
  async getRoutines() {
    try {
      const res = await fetch(`${API_URL}/routines`);
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Analytics
  async getMonthAnalytics(year, month) {
    try {
      const res = await fetch(`${API_URL}/analytics/month?year=${year}&month=${month}`);
      return await res.json();
    } catch (err) {
      console.error(err);
      return { completionPercentage: 0 };
    }
  },

  async getYearAnalytics(year) {
    try {
      const res = await fetch(`${API_URL}/analytics/year?year=${year}`);
      return await res.json();
    } catch (err) {
      console.error(err);
      return { completionPercentage: 0, expiredPercentage: 0 };
    }
  },

  async uploadImage(fileData, isBlob = false) {
    try {
      const formData = new FormData();
      if(isBlob) {
        formData.append('image', fileData, 'camera-capture.png');
      } else {
        formData.append('image', fileData);
      }

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch(err) {
      console.error(err);
      return null;
    }
  }
};
