import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Clock, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/api/notificationService';

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: response, isLoading } = useQuery('notifications', notificationService.getNotifications, {
        refetchInterval: 30000, // Poll every 30s
    });

    const notifications = response?.data || [];
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsReadMutation = useMutation(notificationService.markAsRead, {
        onSuccess: () => queryClient.invalidateQueries('notifications'),
    });

    const markAllReadMutation = useMutation(notificationService.markAllAsRead, {
        onSuccess: () => queryClient.invalidateQueries('notifications'),
    });

    const deleteMutation = useMutation(notificationService.deleteNotification, {
        onSuccess: () => queryClient.invalidateQueries('notifications'),
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await markAsReadMutation.mutateAsync(notification._id);
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden slide-in-top">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-slate-100">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-6 h-6 text-gray-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{n.title}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(n._id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-2 line-clamp-2">{n.message}</p>
                                        <div className="flex items-center text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {!n.isRead && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
