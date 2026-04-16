import { useState, useRef, useEffect } from 'react';

const MonthYearPicker = ({ value, onChange, minYear, maxYear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value) {
      const parts = value.split('/');
      return parseInt(parts[1]) || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });
  const containerRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const startYear = minYear || currentYear;
  const endYear = maxYear || currentYear + 10;

  const months = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      if (parts[1]) {
        setSelectedYear(parseInt(parts[1]));
      }
    }
  }, [value]);

  const handleMonthSelect = (month) => {
    const newValue = `${month}/${selectedYear}`;
    onChange(newValue);
    setIsOpen(false);
  };

  const handlePrevYear = () => {
    if (selectedYear > startYear) {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < endYear) {
      setSelectedYear(selectedYear + 1);
    }
  };

  const getSelectedMonth = () => {
    if (value) {
      const parts = value.split('/');
      return parts[0] || null;
    }
    return null;
  };

  const selectedMonth = getSelectedMonth();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium text-left flex items-center justify-between bg-white hover:border-slate-200"
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {value || 'Select month/year'}
        </span>
        <span className="iconify text-slate-400" data-icon="solar:calendar-bold"></span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-slide-in">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevYear}
                disabled={selectedYear <= startYear}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="iconify text-xl text-slate-600" data-icon="solar:alt-arrow-left-bold"></span>
              </button>
              <span className="font-bold text-slate-800 text-lg">{selectedYear}</span>
              <button
                type="button"
                onClick={handleNextYear}
                disabled={selectedYear >= endYear}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="iconify text-xl text-slate-600" data-icon="solar:alt-arrow-right-bold"></span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {months.map((month) => {
                const isSelected = selectedMonth === month.value && selectedYear === parseInt(value?.split('/')[1]);
                return (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => handleMonthSelect(month.value)}
                    className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#6B8E7B] text-white shadow-md'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {month.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;
