import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check, X } from 'lucide-react'
import { DATE_PRESETS, getPresetRange } from '../../utils/datePresets'
import { format } from 'date-fns'

const GlobalDateRangePicker = ({ value, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [showCustom, setShowCustom] = useState(false)
    const [customStart, setCustomStart] = useState(value?.startDate || '')
    const [customEnd, setCustomEnd] = useState(value?.endDate || '')
    const containerRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handlePresetSelect = (presetId) => {
        if (presetId === 'custom') {
            setShowCustom(true)
            return
        }

        const range = getPresetRange(presetId)
        if (range) {
            onChange(range)
            setIsOpen(false)
            setShowCustom(false)
        }
    }

    const handleCustomApply = (e) => {
        e.stopPropagation()
        if (customStart && customEnd) {
            onChange({
                startDate: customStart,
                endDate: customEnd,
                label: `${format(new Date(customStart), 'MMM dd')} - ${format(new Date(customEnd), 'MMM dd')}`,
                id: 'custom'
            })
            setIsOpen(false)
            setShowCustom(false)
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Premium Dropdown Toggle */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-card border border-input rounded-lg shadow-sm hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 active:scale-[0.98]"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary/70" />
                    <span className="text-sm font-medium text-foreground">
                        {value?.label || 'Select Range'}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu / Mobile Bottom Sheet */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto right-0 mt-2 w-full md:w-72 bg-card rounded-t-2xl md:rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-200">
                        {/* Drag Handle for Mobile */}
                        <div className="md:hidden flex justify-center py-3 border-b border-border/50">
                            <div className="w-12 h-1 bg-muted rounded-full" />
                        </div>

                        {!showCustom ? (
                            <div className="p-2 space-y-1">
                                {DATE_PRESETS.map((preset) => {
                                    const isActive = value?.id === preset.id
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${isActive
                                                ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                                                : 'text-foreground hover:bg-accent font-normal'
                                                }`}
                                        >
                                            <span>{preset.label}</span>
                                            {isActive && <Check className="w-4 h-4" />}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Range</p>
                                    <button
                                        onClick={() => setShowCustom(false)}
                                        className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                                    >
                                        Apply Range
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default GlobalDateRangePicker
