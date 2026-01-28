import {
    format,
    startOfDay,
    endOfDay,
    subDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
} from 'date-fns'

export const DATE_PRESETS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'thisQuarter', label: 'This Quarter' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'last7Days', label: 'Last 7 Days' },
    { id: 'last30Days', label: 'Last 30 Days' },
    { id: 'allTime', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
]

export const getPresetRange = (presetId) => {
    const now = new Date()
    let start = startOfDay(now)
    let end = endOfDay(now)
    let label = 'Today'

    switch (presetId) {
        case 'today':
            start = startOfDay(now)
            end = endOfDay(now)
            label = 'Today'
            break
        case 'yesterday':
            start = startOfDay(subDays(now, 1))
            end = endOfDay(subDays(now, 1))
            label = 'Yesterday'
            break
        case 'thisWeek':
            start = startOfWeek(now, { weekStartsOn: 1 }) // Monday
            end = endOfWeek(now, { weekStartsOn: 1 })
            label = 'This Week'
            break
        case 'thisMonth':
            start = startOfMonth(now)
            end = endOfMonth(now)
            label = 'This Month'
            break
        case 'thisQuarter':
            start = startOfQuarter(now)
            end = endOfQuarter(now)
            label = 'This Quarter'
            break
        case 'thisYear':
            start = startOfYear(now)
            end = endOfYear(now)
            label = 'This Year'
            break
        case 'last7Days':
            start = startOfDay(subDays(now, 7))
            end = endOfDay(now)
            label = 'Last 7 Days'
            break
        case 'last30Days':
            start = startOfDay(subDays(now, 30))
            end = endOfDay(now)
            label = 'Last 30 Days'
            break
        case 'allTime':
            start = new Date(2020, 0, 1) // Default start of system
            end = endOfDay(now)
            label = 'All Time'
            break
        case 'custom':
            return null // Handled by component state
        default:
            start = startOfMonth(now)
            end = endOfMonth(now)
            label = 'This Month'
    }

    return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label,
        id: presetId
    }
}
