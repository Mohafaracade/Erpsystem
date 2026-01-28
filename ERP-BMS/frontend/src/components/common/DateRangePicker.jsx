import { useState } from 'react'
import { Calendar } from 'lucide-react'

const DateRangePicker = ({ onRangeChange, className = '' }) => {
    const [preset, setPreset] = useState('thisMonth')
    const [showCustom, setShowCustom] = useState(false)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const presets = {
        today: { label: 'Today', days: 0 },
        yesterday: { label: 'Yesterday', days: 1 },
        thisWeek: { label: 'This Week', days: 7 },
        thisMonth: { label: 'This Month', days: 30 },
        thisQuarter: { label: 'This Quarter', days: 90 },
        thisYear: { label: 'This Year', days: 365 },
        custom: { label: 'Custom Range', days: null }
    }

    const calculateDateRange = (presetKey) => {
        if (presetKey === 'custom') {
            setShowCustom(true)
            return
        }

        setShowCustom(false)
        const end = new Date()
        const start = new Date()

        if (presetKey === 'today') {
            start.setHours(0, 0, 0, 0)
        } else if (presetKey === 'yesterday') {
            start.setDate(start.getDate() - 1)
            end.setDate(end.getDate() - 1)
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)
        } else if (presetKey === 'thisWeek') {
            const day = start.getDay()
            const diff = start.getDate() - day + (day === 0 ? -6 : 1)
            start.setDate(diff)
            start.setHours(0, 0, 0, 0)
        } else if (presetKey === 'thisMonth') {
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
        } else if (presetKey === 'thisQuarter') {
            const quarter = Math.floor(start.getMonth() / 3)
            start.setMonth(quarter * 3, 1)
            start.setHours(0, 0, 0, 0)
        } else if (presetKey === 'thisYear') {
            start.setMonth(0, 1)
            start.setHours(0, 0, 0, 0)
        }

        onRangeChange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        })
    }

    const handlePresetChange = (presetKey) => {
        setPreset(presetKey)
        calculateDateRange(presetKey)
    }

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            onRangeChange({
                startDate: customStart,
                endDate: customEnd
            })
        }
    }

    return (
        <div className={`relative ${className}`}>
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <select
                    value={preset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="input-field py-2 pr-8 cursor-pointer"
                >
                    {Object.entries(presets).map(([key, { label }]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            {showCustom && (
                <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[300px]">
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">Custom Date Range</p>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="input-field w-full"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setShowCustom(false)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCustomApply}
                                disabled={!customStart || !customEnd}
                                className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DateRangePicker
