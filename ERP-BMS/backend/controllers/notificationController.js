const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @desc    Get all notifications for logged in user
 * @route   GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        return successResponse(res, 'Notifications retrieved', notifications);
    } catch (err) {
        return errorResponse(res, err.message);
    }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return errorResponse(res, 'Notification not found', 404);
        }

        return successResponse(res, 'Notification marked as read', notification);
    } catch (err) {
        return errorResponse(res, err.message);
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true }
        );



        return successResponse(res, 'All notifications marked as read');
    } catch (err) {
        return errorResponse(res, err.message);
    }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!notification) {
            return errorResponse(res, 'Notification not found', 404);
        }

        return successResponse(res, 'Notification deleted');
    } catch (err) {
        return errorResponse(res, err.message);
    }
};

/**
 * Helper to create notifications internally
 */
exports.createNotification = async ({ user, type, title, message, link }) => {
    try {
        await Notification.create({
            user,
            type,
            title,
            message,
            link
        });
        return true;
    } catch (err) {
        console.error('Error creating notification:', err);
        return false;
    }
};
