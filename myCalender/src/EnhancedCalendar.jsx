import React, { useState, useEffect, useRef } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval,
    isWithinInterval, isBefore, addDays, subDays
} from 'date-fns';
import { ChevronLeft, ChevronRight, Bookmark, Trash2, Calendar as CalIcon, Edit3, Plus, X, Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const SEASONAL_THEMES = {
    0: 'bg-blue-600', 1: 'bg-indigo-500', 2: 'bg-cyan-600', 3: 'bg-emerald-500',
    4: 'bg-green-500', 5: 'bg-yellow-500', 6: 'bg-orange-500', 7: 'bg-red-500',
    8: 'bg-amber-600', 9: 'bg-orange-700', 10: 'bg-slate-700', 11: 'bg-blue-800'
};

const HOLIDAYS = {
    '01-01': ['New Year\'s Day'], '01-12': ['National Youth Day'], '01-14': ['Makar Sankranti'], '01-23': ['Parakram Diwas'], '01-26': ['Republic Day'], '01-30': ['Martyrs\' Day'],
    '02-14': ['Valentine\'s Day'], '02-15': ['Maha Shivratri'],
    '03-03': ['Holi', 'Holika Dahan'], '03-04': ['Durga Puja'], '03-12': ['Dandi March'], '03-31': ['Mahavir Jayanti'],
    '04-01': ['Passover'], '04-03': ['Good Friday'], '04-05': ['Easter Sunday'], '04-14': ['Ambedkar Jayanti'], '04-15': ['Bengali New Year'],
    '05-01': ['Buddha Purnima'], '05-08': ['Rabindra Jayanti'], '05-10': ['Mother\'s Day'],
    '06-16': ['Islamic New Year'], '06-21': ['Father\'s Day'],
    '07-26': ['Kargil Vijay Diwas'],
    '08-08': ['Quit India Movement'], '08-15': ['Independence Day'],
    '09-05': ['Teachers\' Day'], '09-14': ['Hindi Diwas'], '09-15': ['Engineer\'s Day'],
    '10-02': ['Gandhi Jayanti'], '10-08': ['Indian Air Force Day'], '10-11': ['Navratri'], '10-20': ['Maha Navami'], '10-26': ['Valmiki Jayanti'], '10-29': ['Karwa Chauth'], '10-31': ['Halloween'],
    '11-03': ['Melbourne Cup'], '11-06': ['Dhanteras'], '11-08': ['Kali Puja'], '11-09': ['Diwali'], '11-10': ['Bhai Dooj', 'Lakshmi Puja'], '11-14': ['Children\'s Day'], '11-15': ['Chhath Puja'], '11-24': ['Guru Nanak Jayanti'], '11-26': ['Thanksgiving Day'],
    '12-07': ['Armed Forces Flag Day'], '12-24': ['Christmas Eve'], '12-25': ['Christmas']
};

const getSeasonString = (monthIndex) => {
    if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
    if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
    if (monthIndex >= 8 && monthIndex <= 10) return 'Autumn';
    return 'Winter';
};

const CONTEXT_EMOJIS = [
    { regex: /flight|airport|fly|plane/i, emoji: '✈️' },
    { regex: /meeting|call|sync|zoom/i, emoji: '💼' },
    { regex: /lunch|dinner|eat|food|breakfast|restaurant|pizza|party/i, emoji: '🍔' },
    { regex: /birthday|bday|celebrate|cake/i, emoji: '🎂' },
    { regex: /doctor|dentist|appointment|medical|hospital/i, emoji: '🏥' },
    { regex: /gym|workout|lift|train|run/i, emoji: '🏋️' },
    { regex: /code|hack|dev|build|project/i, emoji: '💻' }
];

const getContextEmoji = (text) => {
    for (const context of CONTEXT_EMOJIS) {
        if (context.regex.test(text)) return context.emoji;
    }
    return '';
};


const EnhancedCalendar = () => {
    const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [dragAnchor, setDragAnchor] = useState(null);
    const [notes, setNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectorMode, setSelectorMode] = useState('grid'); // 'grid' | 'month' | 'year'
    const [focusedDate, setFocusedDate] = useState(null);
    const calendarRef = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem('calendar-notes-data');
        if (saved) {
            try {
                setNotes(JSON.parse(saved));
            } catch (e) {
                console.error("Local storage parse error", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('calendar-notes-data', JSON.stringify(notes));
    }, [notes]);

    // Context Helpers
    const currentMonthKey = format(viewDate, 'yyyy-MM');
    const startKey = startDate ? format(startDate, 'yyyy-MM-dd') : null;
    const endKey = endDate ? format(endDate, 'yyyy-MM-dd') : null;
    
    let activeContext = 'month';
    if (startDate && endDate) activeContext = 'range';
    else if (startDate) activeContext = 'date';

    const getFilteredNotes = () => {
        let filtered = notes.filter(n => {
            if (activeContext === 'range') return n.type === 'range' && n.startKey === startKey && n.endKey === endKey;
            if (activeContext === 'date') return n.type === 'date' && n.startKey === startKey;
            return n.monthKey === currentMonthKey;
        });

        // Revert dynamically injected holidays, sort as usual.
        if (activeContext === 'month' || activeContext === 'range') {
            filtered.sort((a, b) => {
                const dateA = a.startKey || '0000-00-00';
                const dateB = b.startKey || '0000-00-00';
                return dateA.localeCompare(dateB);
            });
        }
        return filtered;
    };

    const DOT_COLORS = {
        'border-sky-400': 'bg-sky-400',
        'border-indigo-400': 'bg-indigo-400',
        'border-emerald-400': 'bg-emerald-400',
        'border-rose-400': 'bg-rose-400',
        'border-amber-400': 'bg-amber-400'
    };
    
    const getDotColor = (colorClassStr) => {
        const borderClass = colorClassStr.split(' ').find(c => c.startsWith('border-'));
        return borderClass && DOT_COLORS[borderClass] ? DOT_COLORS[borderClass] : 'bg-slate-400';
    };

    const formatNoteDate = (note) => {
        if (!note.startKey) return 'Month Memo';
        try {
            const d1 = new Date(note.startKey + 'T12:00:00');
            if (note.type === 'range' && note.endKey) {
                const d2 = new Date(note.endKey + 'T12:00:00');
                return `${format(d1, 'MMM d')} - ${format(d2, 'MMM d')}`;
            }
            return format(d1, 'MMM d, yyyy');
        } catch {
            return note.startKey;
        }
    };

    const handleAddNote = () => {
        if (!newNoteText.trim()) return;
        const colors = [
            'bg-sky-50 border-sky-400 text-sky-900',
            'bg-indigo-50 border-indigo-400 text-indigo-900',
            'bg-emerald-50 border-emerald-400 text-emerald-900',
            'bg-rose-50 border-rose-400 text-rose-900',
            'bg-amber-50 border-amber-400 text-amber-900'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        const newNote = {
            id: Date.now().toString(),
            text: newNoteText,
            type: activeContext,
            monthKey: currentMonthKey,
            startKey: startKey,
            endKey: endKey,
            color: randomColor
        };
        setNotes([...notes, newNote]);
        setNewNoteText('');
    };

    const deleteNote = (id) => {
        setNotes(notes.filter(n => n.id !== id));
    };

    const getContextTitle = () => {
        if (activeContext === 'range') return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
        if (activeContext === 'date') return format(startDate, 'EEEE, MMMM d');
        return `Notes for ${format(viewDate, 'MMMM')}`;
    };

    // Generate exactly 42 days (6 full weeks) to completely prevent layout shift jitter when changing months
    const monthStart = startOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days = Array.from({ length: 42 }).map((_, i) => addDays(gridStart, i));

    const accentColor = SEASONAL_THEMES[viewDate.getMonth()];

    // --- Logic: Unified Ranger Selection (Drag + Tap) ---
    const handlePointerDown = (day) => {
        if (!isSameMonth(day, viewDate)) return;
        
        // Tap toggle exactly single date
        if (startDate && !endDate && isSameDay(day, startDate)) {
            setStartDate(null);
            setEndDate(null);
            setDragAnchor(null);
            return;
        }

        // Tap to complete range instantly (mobile support)
        if (startDate && !endDate) {
            if (isBefore(day, startDate)) {
                setEndDate(startDate);
                setStartDate(day);
            } else {
                setEndDate(day);
            }
            setDragAnchor(null);
            return;
        }

        setDragAnchor(day);
        setStartDate(day);
        setEndDate(null);
    };

    const handlePointerEnter = (day) => {
        if (!dragAnchor || !isSameMonth(day, viewDate)) return;
        if (isBefore(day, dragAnchor)) {
            setStartDate(day);
            setEndDate(dragAnchor);
        } else if (isSameDay(day, dragAnchor)) {
            setStartDate(dragAnchor);
            setEndDate(null);
        } else {
            setStartDate(dragAnchor);
            setEndDate(day);
        }
    };

    const handlePointerUp = () => {
        setDragAnchor(null);
    };

    const handleKeyDown = (e) => {
        if (!focusedDate || selectorMode !== 'grid') return;
        let newDate = new Date(focusedDate);
        
        switch (e.key) {
            case 'ArrowRight': newDate = addDays(newDate, 1); break;
            case 'ArrowLeft': newDate = subDays(newDate, 1); break;
            case 'ArrowDown': newDate = addDays(newDate, 7); break;
            case 'ArrowUp': newDate = subDays(newDate, 7); break;
            case 'Enter':
            case ' ':
                handlePointerDown(focusedDate);
                e.preventDefault();
                return;
            default: return;
        }
        
        e.preventDefault();
        if (!isSameMonth(newDate, viewDate)) setViewDate(startOfMonth(newDate));
        setFocusedDate(newDate);
    };

    return (
        <div 
            className={cn("min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-8 transition-colors duration-500", isDarkMode ? "bg-slate-900" : "bg-slate-100")}
            style={{ fontFamily: "'Outfit', sans-serif" }}
        >
            <div 
                ref={calendarRef}
                className={cn("w-full h-full sm:h-auto max-w-5xl sm:rounded-3xl sm:shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 md:grid-rows-[auto_1fr] md:min-h-[500px] md:max-h-[90vh] border-0 sm:border transition-colors duration-500", isDarkMode ? "bg-slate-800 border-slate-700 shadow-black/40" : "bg-white border-slate-200")}
            >

                {/* Header Image Area */}
                <div className="order-1 md:col-span-5 md:row-start-1 relative h-48 md:h-80 overflow-hidden shrink-0">
                        <img
                            key={viewDate.getMonth()}
                            src={`https://picsum.photos/seed/2026-${viewDate.getMonth()}/800/600`}
                            className="w-full h-full object-cover animate-[fadeIn_1s_ease-in-out]"
                            alt="Calendar Theme"
                        />
                        <div className={cn("absolute inset-0 opacity-40", accentColor)} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-8 left-8 text-white">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-black uppercase tracking-[0.4em] opacity-80" style={{ fontFamily: "'Outfit', sans-serif" }}>2026 Edition</p>
                                <span className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase shadow-sm border", isDarkMode ? "bg-black/40 text-blue-300 border-white/10" : "bg-white/30 text-white border-white/20 backdrop-blur-sm")} style={{ fontFamily: "'Outfit', sans-serif" }}>{getSeasonString(viewDate.getMonth())}</span>
                            </div>
                            <h1 className="text-6xl tracking-tight" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 600 }}>{format(viewDate, 'MMMM')}</h1>
                        </div>
                    </div>

                {/* Notes Area Custom List */}
                <div className={cn("order-3 md:col-span-5 md:row-start-2 p-6 md:p-8 flex-grow flex flex-col overflow-hidden min-h-[300px] transition-colors duration-500", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50/30 border-slate-100", "md:border-r")}>
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <div className={cn("flex items-center gap-2", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                                <Edit3 size={18} />
                                <span className="text-xs font-bold uppercase tracking-widest">{getContextTitle()}</span>
                            </div>
                            <span className={cn("text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md", isDarkMode ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-200/50")}>
                                {notes.filter(n => n.monthKey === currentMonthKey).length} Event{notes.filter(n => n.monthKey === currentMonthKey).length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Note List */}
                        <style>{`
                            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                            @keyframes slideUpFade {
                                from { opacity: 0; transform: translateY(15px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            @keyframes fadeIn {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            @keyframes flipY {
                                0% { transform: perspective(800px) rotateY(90deg); opacity: 0; }
                                100% { transform: perspective(800px) rotateY(0deg); opacity: 1; }
                            }
                            .animate-slide-up {
                                animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                                opacity: 0;
                            }
                            .animate-flip {
                                animation: flipY 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                transform-origin: center;
                            }
                            .hide-scroll::-webkit-scrollbar {
                                display: none;
                            }
                            .hide-scroll {
                                -ms-overflow-style: none;  /* IE and Edge */
                                scrollbar-width: none;  /* Firefox */
                            }
                        `}</style>
                        <div className="flex-grow overflow-y-auto hide-scroll space-y-3 pr-2">
                            {getFilteredNotes().length === 0 ? (
                                <div className="text-sm text-slate-400 italic mt-2">No notes here yet...</div>
                            ) : (
                                getFilteredNotes().map((n, idx) => (
                                    <div 
                                        key={n.id} 
                                        className={cn("animate-slide-up relative group border-l-4 rounded-xl p-4 shadow-sm transition-all hover:translate-x-1", n.color)}
                                        style={{ animationDelay: `${idx * 75}ms` }}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1.5 flex items-center gap-1.5">
                                            <span>{formatNoteDate(n)}</span>
                                        </div>
                                        <p className="text-sm font-medium pr-6 leading-relaxed flex items-center gap-2">
                                            {getContextEmoji(n.text) && <span className="text-base leading-none">{getContextEmoji(n.text)}</span>}
                                            {n.text}
                                        </p>
                                        {n.isHoliday ? (
                                            <div className="absolute top-[10px] right-3 opacity-60">
                                                <Bookmark size={14} className="text-emerald-500 fill-emerald-500" />
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => deleteNote(n.id)}
                                                className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded transition-all cursor-pointer"
                                            >
                                                <X size={14} className="opacity-50 hover:opacity-100" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Note Input */}
                        <div className={cn("mt-4 pt-4 border-t flex gap-2 flex-shrink-0", isDarkMode ? "border-slate-700" : "border-slate-100")}>
                            <input 
                                type="text"
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                placeholder={`Add note to ${activeContext}...`}
                                className={cn("flex-grow border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all shadow-sm", isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-900/30" : "bg-white border-slate-200 text-slate-800 focus:border-blue-400")}
                            />
                            <button 
                                onClick={handleAddNote}
                                className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                {/* RIGHT PANEL: The Grid */}
                <div className={cn("order-2 md:col-span-7 md:col-start-6 md:row-span-2 p-4 pt-6 md:p-8 flex flex-col transition-colors duration-500 overflow-y-auto hide-scroll", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}>

                    {/* Navigation */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6 md:mb-12">
                        
                        {/* Upper Mobile Row / Left Desktop */}
                        <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3 md:gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewDate(subMonths(viewDate, 1))}
                                    className={cn("p-2 md:p-3 rounded-full transition-colors cursor-pointer border", isDarkMode ? "hover:bg-slate-700 border-slate-700 text-slate-300" : "hover:bg-slate-100 border-slate-100 text-slate-600")}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                                    className={cn("p-2 md:p-3 rounded-full transition-colors cursor-pointer border", isDarkMode ? "hover:bg-slate-700 border-slate-700 text-slate-300" : "hover:bg-slate-100 border-slate-100 text-slate-600")}
                                >
                                    <ChevronRight size={20} />
                                </button>
                                <button 
                                    onClick={() => { setViewDate(new Date()); setStartDate(null); setEndDate(null); setSelectorMode('grid'); }}
                                    className={cn("px-2 py-1 ml-1 text-xs font-black uppercase tracking-widest transition-all cursor-pointer underline-offset-4 hover:underline text-orange-500 hover:text-orange-600 dark:hover:text-orange-400")}
                                >
                                    Today
                                </button>
                            </div>

                            {/* Mobile Year Display (Hidden on Desktop) */}
                            <div className="md:hidden flex items-center gap-3">
                                <button
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className={cn("p-2 rounded-full transition-colors cursor-pointer border", isDarkMode ? "bg-slate-700 hover:bg-slate-600 border-slate-600 text-yellow-400 shadow-inner" : "hover:bg-slate-100 border-slate-100 text-slate-600")}
                                >
                                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                                </button>
                                <div className={cn("text-lg font-black tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-800")} style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    <span>{viewDate.getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lower Mobile Row / Middle Desktop */}
                        <div className="flex items-center w-full md:w-auto justify-center md:justify-start pt-2 md:pt-0 border-t md:border-none border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectorMode(selectorMode === 'month' ? 'grid' : 'month')}
                                    className={cn("px-4 md:px-3 py-2 text-xs font-black transition-all cursor-pointer border rounded-xl shadow-sm", selectorMode === 'month' ? (isDarkMode ? "bg-slate-700 text-white border-slate-500" : "bg-slate-800 text-white border-slate-800") : (isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-700 bg-transparent hover:bg-slate-50"))}
                                >
                                    Month
                                </button>
                                <button
                                    onClick={() => setSelectorMode(selectorMode === 'year' ? 'grid' : 'year')}
                                    className={cn("px-4 md:px-3 py-2 text-xs font-black transition-all cursor-pointer border rounded-xl shadow-sm", selectorMode === 'year' ? (isDarkMode ? "bg-slate-700 text-white border-slate-500" : "bg-slate-800 text-white border-slate-800") : (isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-700 bg-transparent hover:bg-slate-50"))}
                                >
                                    Year
                                </button>
                            </div>
                        </div>

                        {/* Right Desktop Area */}
                        <div className="hidden md:flex items-center gap-4 shrink-0 pl-2">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className={cn("p-2.5 rounded-full transition-colors cursor-pointer border", isDarkMode ? "bg-slate-700 hover:bg-slate-600 border-slate-600 text-yellow-400 shadow-inner" : "hover:bg-slate-100 border-slate-100 text-slate-600")}
                            >
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <div className={cn("text-xl font-black tracking-widest border-l pl-4", isDarkMode ? "text-slate-300 border-slate-700" : "text-slate-800 border-slate-200")} style={{ fontFamily: "'Outfit', sans-serif" }}>
                                <span>{viewDate.getFullYear()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow relative outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
                    {selectorMode === 'grid' && (
                        <div className="animate-flip flex flex-col h-full">
                            <div className="grid grid-cols-7 gap-1 md:gap-4 mb-2 md:mb-4 px-2 md:px-0">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} className={cn("text-center text-[10px] md:text-xs font-black tracking-[0.2em] uppercase", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 grid-rows-6 gap-1 md:gap-4 flex-grow px-2 md:px-0" onPointerLeave={handlePointerUp}>
                                {days.map((day, idx) => {
                                    const isCurMonth = isSameMonth(day, viewDate);
                                    const isActualToday = isSameDay(day, new Date());
                                    const isStart = startDate && isSameDay(day, startDate);
                                    const isEnd = endDate && isSameDay(day, endDate);
                                    const inRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
                                    const dayNotes = notes.filter(n => 
                                        (n.type === 'date' && n.startKey === format(day, 'yyyy-MM-dd')) ||
                                        (n.type === 'range' && n.startKey <= format(day, 'yyyy-MM-dd') && n.endKey >= format(day, 'yyyy-MM-dd'))
                                    );
                                    const hasHoliday = !!HOLIDAYS[format(day, 'MM-dd')];
                                    const isFocused = focusedDate && isSameDay(day, focusedDate);

                                    return (
                                        <div
                                            key={idx}
                                            onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); handlePointerDown(day); setFocusedDate(day); }}
                                            onPointerEnter={() => handlePointerEnter(day)}
                                            onPointerUp={handlePointerUp}
                                            className={cn(
                                                "relative flex items-center justify-center transition-all duration-200 select-none group focus:outline-none cursor-pointer h-10 md:h-auto min-h-[40px] md:min-h-[50px]",
                                                !isCurMonth && (isDarkMode ? "opacity-30" : "opacity-0 invisible md:visible md:opacity-30"),
                                                inRange && !isStart && !isEnd && (isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-600"),
                                                isStart && "bg-blue-600 text-white rounded-l-2xl z-20 shadow-lg scale-105",
                                                isEnd && "bg-blue-600 text-white rounded-r-2xl z-20 shadow-lg scale-105",
                                                isFocused && "ring-2 ring-indigo-500 rounded-xl z-30 ring-offset-2 dark:ring-offset-slate-800 scale-105",
                                                isActualToday && !isStart && !isEnd && !inRange && (isDarkMode ? "ring-2 ring-orange-500/50 bg-orange-500/10 rounded-xl" : "ring-2 ring-orange-400 bg-orange-50 rounded-xl")
                                            )}
                                        >
                                            <span className={cn(
                                                "relative z-30 text-base font-bold",
                                                !isStart && !isEnd && isCurMonth && (isActualToday ? "text-orange-500" : (isDarkMode ? "text-slate-200 group-hover:text-blue-400" : "text-slate-700 group-hover:text-blue-500")),
                                            )}>
                                                {format(day, 'd')}
                                            </span>

                                    {/* Visual Hint for Hover */}
                                    {isCurMonth && !isStart && !isEnd && !inRange && (
                                        <div className={cn("absolute inset-2 rounded-xl transition-colors", isDarkMode ? "group-hover:bg-slate-700/50" : "group-hover:bg-slate-50")} />
                                    )}

                                    {/* Pointers / Dots */}
                                    {isCurMonth && (hasHoliday || dayNotes.length > 0) && (
                                        <div className="absolute bottom-1 md:bottom-2 flex gap-1 justify-center items-center w-full z-10 pointer-events-none">
                                            {hasHoliday && <span className="w-2 h-2 rounded-full shadow-sm bg-emerald-500 ring-2 ring-emerald-500/30 animate-[pulse_3s_ease-in-out_infinite]" />}
                                            {dayNotes.slice(0, hasHoliday ? 2 : 3).map((n, idx) => (
                                                <span key={idx} className={cn("w-1.5 h-1.5 rounded-full shadow-sm", getDotColor(n.color))} />
                                            ))}
                                            {dayNotes.length > (hasHoliday ? 2 : 3) && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shadow-sm" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                 </div>
                 )}

                    {selectorMode === 'month' && (
                        <div className="animate-flip flex-grow grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 content-center h-full">
                            {Array.from({ length: 12 }).map((_, i) => {
                                const mDate = new Date(viewDate.getFullYear(), i, 1);
                                const isCurrent = isSameMonth(mDate, viewDate);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => { setViewDate(new Date(viewDate.getFullYear(), i, 1)); setSelectorMode('grid'); }}
                                        className={cn(
                                            "relative overflow-hidden group p-3 md:p-5 rounded-2xl flex flex-col items-start justify-between transition-all duration-300 text-left h-20 md:h-28",
                                            isCurrent ? "bg-blue-600 shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800" 
                                                      : (isDarkMode ? "bg-slate-800/80 hover:bg-slate-700 ring-1 ring-slate-700" : "bg-white hover:bg-slate-50 shadow-sm hover:shadow ring-1 ring-slate-200/60")
                                        )}
                                    >
                                        <div className={cn("text-[9px] md:text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md backdrop-blur-sm z-10", 
                                            isCurrent ? "bg-white/20 text-blue-100" : (isDarkMode ? "bg-slate-700/50 text-slate-400 border border-slate-600/50" : "bg-slate-100/80 text-slate-500 border border-slate-200/50")
                                        )}>
                                            {getSeasonString(i)}
                                        </div>
                                        <div className={cn("text-lg md:text-2xl font-black tracking-wider relative z-10", isCurrent ? "text-white" : (isDarkMode ? "text-slate-100 group-hover:text-blue-400" : "text-slate-800 group-hover:text-blue-600"))}>
                                            {format(mDate, 'MMM')}
                                        </div>
                                        <div className={cn("absolute -bottom-3 -right-2 text-6xl md:text-7xl font-black transition-transform duration-500 group-hover:scale-110 select-none pointer-events-none", isCurrent ? "text-white opacity-20" : (isDarkMode ? "text-slate-700 opacity-40" : "text-slate-200 opacity-60"))}>
                                            {(i+1).toString().padStart(2,'0')}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectorMode === 'year' && (
                        <div className="animate-flip flex-grow grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 content-center h-full">
                            {Array.from({ length: 12 }).map((_, i) => {
                                const y = viewDate.getFullYear() - 5 + i;
                                const isCurrent = y === viewDate.getFullYear();
                                return (
                                    <button
                                        key={y}
                                        onClick={() => { setViewDate(new Date(y, viewDate.getMonth(), 1)); setSelectorMode('grid'); }}
                                        className={cn(
                                            "relative overflow-hidden group p-3 md:p-5 rounded-2xl flex flex-col items-start justify-between transition-all duration-300 text-left h-20 md:h-28",
                                            isCurrent ? "bg-blue-600 shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800" 
                                                      : (isDarkMode ? "bg-slate-800/80 hover:bg-slate-700 ring-1 ring-slate-700" : "bg-white hover:bg-slate-50 shadow-sm hover:shadow ring-1 ring-slate-200/60")
                                        )}
                                    >
                                        <div className="flex w-full items-center justify-between z-10 opacity-70">
                                            <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-colors", isCurrent ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" : (isDarkMode ? "bg-slate-600 group-hover:bg-blue-500" : "bg-slate-300 group-hover:bg-blue-500"))} />
                                            {isCurrent && <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-200">Active</span>}
                                        </div>

                                        <span className={cn("text-xl md:text-3xl font-black tracking-widest relative z-10 transition-transform duration-500 group-hover:translate-x-1", isCurrent ? "text-white" : (isDarkMode ? "text-slate-200 group-hover:text-blue-400" : "text-slate-700 group-hover:text-blue-600"))}>
                                            {y}
                                        </span>

                                        <div className={cn("absolute -bottom-4 -right-1 text-7xl md:text-[80px] font-black transition-transform duration-500 group-hover:scale-110 select-none pointer-events-none leading-none", isCurrent ? "text-white opacity-10" : (isDarkMode ? "text-slate-700 opacity-20" : "text-slate-200 opacity-40"))}>
                                            {y.toString().slice(2)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    </div>

                    {/* Range Selection Status Footer & Holidays */}
                    <div className={cn("mt-auto pt-4 border-t flex flex-col justify-end gap-3", isDarkMode ? "border-slate-700" : "border-slate-100")}>
                        
                        {/* Holidays Viewer Container */}
                        <div className="w-full relative">
                            {/* Horizontal Swipe Track */}
                            <div className="flex overflow-x-auto hide-scroll gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider pb-1">
                                {Object.keys(HOLIDAYS).filter(k => k.startsWith(format(viewDate, 'MM'))).length === 0 ? (
                                    <div className={cn("shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                                        <Bookmark size={12} />
                                        <span className="italic">No major holidays this month</span>
                                    </div>
                                ) : (
                                    Object.keys(HOLIDAYS).filter(k => k.startsWith(format(viewDate, 'MM'))).map(k => (
                                        HOLIDAYS[k].map((hol, idx) => (
                                            <div key={`${k}-${idx}`} className={cn("shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border", isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-100")}>
                                                <span className="opacity-60">{parseInt(k.substring(3))} {format(viewDate, 'MMM')}</span>
                                                <span className="w-1 h-1 rounded-full bg-emerald-500 opacity-40 mx-0.5" />
                                                <span>{hol}</span>
                                            </div>
                                        ))
                                    ))
                                )}
                            </div>
                            
                            {/* Visual Fade to indicate scrollable depth gracefully without scrollbars */}
                            <div className={cn("absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l pointer-events-none", isDarkMode ? "from-slate-800 to-transparent" : "from-white to-transparent")} />
                        </div>

                        {/* Status Footer */}
                        <div className="relative w-full h-[84px]">
                            {/* Active Selection State */}
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-between p-3 md:p-5 rounded-2xl border shadow-md transition-all duration-500",
                                startDate ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-2 scale-95 pointer-events-none",
                                isDarkMode ? "bg-slate-700/50 border-slate-600/50 ring-1 ring-white/5" : "bg-white border-slate-100 ring-1 ring-black/5"
                            )}>
                                <div className="flex flex-col">
                                    <span className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <CalIcon size={10} /> Active Selection
                                    </span>
                                    <div className={cn("flex flex-wrap md:flex-nowrap items-center gap-1 md:gap-2", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                                        <span className="font-black text-xs md:text-base">{startDate ? format(startDate, 'MMM dd, yyyy') : ''}</span>
                                        {endDate && (
                                            <>
                                                <span className={cn("font-black px-0.5", isDarkMode ? "text-slate-500" : "text-slate-300")}>➔</span>
                                                <span className="font-black text-xs md:text-base">{format(endDate, 'MMM dd, yyyy')}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setStartDate(null); setEndDate(null); setDragAnchor(null); }}
                                    className={cn("group flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black shadow-sm transition-all duration-300 cursor-pointer overflow-hidden border hover:text-white shrink-0", isDarkMode ? "bg-red-900/30 text-red-400 border-red-900/50 hover:bg-red-500 hover:border-red-500" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:border-red-500")}
                                >
                                    <Trash2 size={14} className="group-hover:-translate-y-0.5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                                    <span>Clear</span>
                                </button>
                            </div>

                            {/* Empty Prompt State */}
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-center gap-2 md:gap-3 px-2 rounded-2xl border border-dashed transition-all duration-500 delay-100",
                                !startDate ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none",
                                isDarkMode ? "bg-slate-900/30 border-slate-700 text-slate-500" : "bg-slate-50/50 border-slate-100 text-slate-400"
                            )}>
                                <CalIcon size={14} className="opacity-50 shrink-0" />
                                <p className="text-[11px] md:text-sm font-bold tracking-wide text-center">Swipe dates to pick a range...</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedCalendar;