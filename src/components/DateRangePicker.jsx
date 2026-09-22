import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DateRangePicker({ 
  currentPeriod, 
  customRange, 
  onSelectPeriod, 
  onApplyCustomRange,
  isOpen: controlledIsOpen,
  onOpenChange,
  hideTriggerButton = false
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const popoverRef = useRef(null);

  // Hoje no fuso local
  const today = new Date();
  // Exibe mês anterior na esquerda e mês atual na direita, idêntico à UTMify
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1));

  // Seleção temporária de range
  const [tempStart, setTempStart] = useState(() => customRange?.since || formatISODate(new Date(today.getTime() - 6 * 86400000)));
  const [tempEnd, setTempEnd] = useState(() => customRange?.until || formatISODate(today));
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    if (customRange?.since && customRange?.until) {
      setTempStart(customRange.since);
      setTempEnd(customRange.until);
    }
  }, [isOpen, customRange]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        if (typeof setIsOpen === 'function') {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      // Delay pequeno para não fechar no mesmo clique do select
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, setIsOpen]);

  const prevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Mês 1 (Esquerda) e Mês 2 (Direita)
  const leftMonthDate = viewDate;
  const rightMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

  const handleSelectPresetPill = (preset) => {
    const now = new Date();
    let s = new Date();
    let u = new Date();

    if (preset === 'Hoje') {
      s = now;
      u = now;
    } else if (preset === 'Ontem') {
      s = new Date(now.getTime() - 86400000);
      u = s;
    } else if (preset === '7 dias') {
      s = new Date(now.getTime() - 6 * 86400000);
      u = now;
    } else if (preset === '15 dias') {
      s = new Date(now.getTime() - 14 * 86400000);
      u = now;
    } else if (preset === '30 dias') {
      s = new Date(now.getTime() - 29 * 86400000);
      u = now;
    } else if (preset === 'Este mês') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      u = now;
    } else if (preset === 'Mês passado' || preset === 'mes passado') {
      const y = now.getFullYear();
      const m = now.getMonth();
      s = new Date(y, m - 1, 1);
      u = new Date(y, m, 0);
    } else if (preset === 'Máximo' || preset === 'maximo') {
      if (typeof onSelectPeriod === 'function') {
        onSelectPeriod('Máximo');
        setIsOpen(false);
        return;
      }
      s = new Date(2020, 0, 1);
      u = now;
    }

    const sinceStr = formatISODate(s);
    const untilStr = formatISODate(u);
    setTempStart(sinceStr);
    setTempEnd(untilStr);
    setViewDate(new Date(s.getFullYear(), s.getMonth() - 1, 1));
  };

  const handleDayClick = (dateStr) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleApply = () => {
    const finalStart = tempStart || formatISODate(today);
    const finalEnd = tempEnd || finalStart;
    onApplyCustomRange({ since: finalStart, until: finalEnd });
    setIsOpen(false);
  };

  const renderMonthCalendar = (mDate) => {
    const year = mDate.getFullYear();
    const month = mDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Dias do mês anterior (esmaecidos)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      cells.push({
        day: dNum,
        dateStr: null,
        isCurrentMonth: false
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true
      });
    }

    // Dias do próximo mês para completar grid de 35 ou 42 células
    const remaining = 35 - cells.length;
    if (remaining > 0) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          day: d,
          dateStr: null,
          isCurrentMonth: false
        });
      }
    }

    return (
      <div className="w-full">
        <div className="text-center font-bold text-white text-xs mb-3">
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-zinc-500 mb-1.5">
          {DAY_LETTERS.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs font-medium">
          {cells.map((c, idx) => {
            if (!c.isCurrentMonth) {
              return (
                <div key={idx} className="h-7 flex items-center justify-center text-zinc-600 text-[11px]">
                  {c.day}
                </div>
              );
            }

            const isStart = c.dateStr === tempStart;
            const isEnd = c.dateStr === tempEnd;
            const effectiveEnd = tempEnd || (hoverDate && hoverDate > tempStart ? hoverDate : null);
            const inRange = tempStart && effectiveEnd && c.dateStr > tempStart && c.dateStr < effectiveEnd;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayClick(c.dateStr)}
                onMouseEnter={() => !tempEnd && setHoverDate(c.dateStr)}
                className={`h-7 w-full rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer ${
                  isStart || isEnd
                    ? 'bg-[#0066FF] text-white font-bold shadow-md shadow-blue-600/30'
                    : inRange
                    ? 'bg-[#0066FF]/20 text-[#5C9BFF]'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const isCustomActive = currentPeriod === 'Personalizado';
  const displayLabel = isCustomActive && customRange?.since && customRange?.until
    ? `${customRange.since.split('-').reverse().slice(0, 2).join('/')} - ${customRange.until.split('-').reverse().slice(0, 2).join('/')}`
    : 'Personalizado';

  return (
    <div className={hideTriggerButton ? "relative w-full" : "relative inline-block"} ref={popoverRef}>
      {/* Botão Gatilho Personalizado */}
      {!hideTriggerButton && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
            isCustomActive || isOpen
              ? 'bg-[#0066FF] text-white font-bold shadow-sm'
              : 'bg-[#141C2E] border-[#1E293B] text-zinc-300 hover:text-white hover:bg-[#182236]'
          }`}
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${isCustomActive || isOpen ? 'text-white' : 'text-[#5C9BFF]'}`} />
          <span>{displayLabel}</span>
        </button>
      )}

      {/* Popover idêntico ao da UTMify */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[310px] sm:w-[560px] bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 shadow-2xl animate-in fade-in zoom-in-95">
          {/* Top Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3.5 mb-3.5 border-b border-[#1E293B]">
            {['Hoje', 'Ontem', '7 dias', '15 dias', '30 dias', 'Este mês', 'Mês passado', 'Máximo'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPresetPill(p)}
                className="px-2.5 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Month Navigation & Calendars */}
          <div className="relative">
            {/* Nav Arrows */}
            <div className="flex items-center justify-between absolute top-0 left-0 right-0 z-10 px-1 pointer-events-none">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white pointer-events-auto cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white pointer-events-auto cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendars Grid (1 coluna no mobile, 2 no desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {renderMonthCalendar(leftMonthDate)}
              <div className="hidden sm:block">
                {renderMonthCalendar(rightMonthDate)}
              </div>
            </div>
          </div>

          {/* Range Preview String */}
          <div className="mt-4 pt-3 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-[11px] font-mono text-zinc-400">
              {tempStart ? tempStart.split('-').reverse().join('/') : 'Início'}
              {' → '}
              {tempEnd ? tempEnd.split('-').reverse().join('/') : (tempStart ? tempStart.split('-').reverse().join('/') : 'Fim')}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#1E293B] text-zinc-400 hover:text-white hover:bg-[#0D1424] transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold transition-all shadow-md shadow-blue-600/25 cursor-pointer text-xs"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
