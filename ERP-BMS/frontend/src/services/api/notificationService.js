import apiClient from './apiClient';

const API_URL = '/notifications';

const notificationService = {
    getNotifications: async () => {
        const response = await apiClient.get(API_URL);
        return response.data;
    },

    markAsRead: async (id) => {
        const response = await apiClient.patch(`${API_URL}/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await apiClient.patch(`${API_URL}/read-all`);
        return response.data;
    },

    deleteNotification: async (id) => {
        const response = await apiClient.delete(`${API_URL}/${id}`);
        return response.data;
    }
};

export default notificationService;

