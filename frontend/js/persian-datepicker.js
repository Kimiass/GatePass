// Persian Date Picker Component
class PersianDatePicker {
    constructor(inputElement) {
        this.input = inputElement;
        this.hiddenInput = null;
        this.calendar = null;
        this.currentJalaliDate = this.getTodayJalali();
        this.selectedDate = null;
        this.minDate = null;

        this.monthNames = [
            'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ];

        this.weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

        this.init();
    }

    init() {
        // Create hidden input for Gregorian date
        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'hidden';
        this.hiddenInput.name = this.input.name;
        this.hiddenInput.id = this.input.id;

        // Modify original input
        this.input.type = 'text';
        this.input.name = this.input.name + '_display';
        this.input.id = this.input.id + '_display';
        this.input.placeholder = 'مثال: 1404/11/23';
        this.input.autocomplete = 'off';
        this.input.style.cursor = 'pointer';

        // Insert hidden input after display input
        this.input.parentNode.insertBefore(this.hiddenInput, this.input.nextSibling);

        // Set min date if exists
        const minAttr = this.input.getAttribute('data-min-date');
        if (minAttr) {
            this.minDate = this.gregorianToJalali(new Date(minAttr));
        }

        // Set initial value if exists
        const initialValue = this.hiddenInput.value || this.input.getAttribute('data-initial-value');
        if (initialValue) {
            const date = new Date(initialValue);
            const jalali = this.gregorianToJalali(date);
            this.selectedDate = jalali;
            this.input.value = this.formatJalaliDate(jalali);
        }

        // Create calendar
        this.createCalendar();

        // Event listeners
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCalendar();
        });

        this.input.addEventListener('input', () => {
            this.handleManualInput();
        });

        this.input.addEventListener('blur', () => {
            this.validateManualInput();
        });

        // Close calendar when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.calendar.contains(e.target) && e.target !== this.input) {
                this.hideCalendar();
            }
        });
    }

    createCalendar() {
        this.calendar = document.createElement('div');
        this.calendar.className = 'persian-calendar';
        this.calendar.style.display = 'none';

        // Calendar header
        const header = document.createElement('div');
        header.className = 'calendar-header';

        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '◀';
        prevBtn.className = 'calendar-nav-btn';
        prevBtn.type = 'button';
        prevBtn.addEventListener('click', () => this.previousMonth());

        const monthYearDisplay = document.createElement('div');
        monthYearDisplay.className = 'calendar-month-year';

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '▶';
        nextBtn.className = 'calendar-nav-btn';
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', () => this.nextMonth());

        header.appendChild(nextBtn);
        header.appendChild(monthYearDisplay);
        header.appendChild(prevBtn);

        // Week days
        const weekDaysRow = document.createElement('div');
        weekDaysRow.className = 'calendar-weekdays';
        this.weekDays.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-weekday';
            dayEl.textContent = day;
            weekDaysRow.appendChild(dayEl);
        });

        // Days container
        const daysContainer = document.createElement('div');
        daysContainer.className = 'calendar-days';

        // Today button
        const footer = document.createElement('div');
        footer.className = 'calendar-footer';
        const todayBtn = document.createElement('button');
        todayBtn.textContent = 'امروز';
        todayBtn.className = 'calendar-today-btn';
        todayBtn.type = 'button';
        todayBtn.addEventListener('click', () => this.selectToday());
        footer.appendChild(todayBtn);

        this.calendar.appendChild(header);
        this.calendar.appendChild(weekDaysRow);
        this.calendar.appendChild(daysContainer);
        this.calendar.appendChild(footer);

        document.body.appendChild(this.calendar);
    }

    showCalendar() {
        // Position calendar below input
        const rect = this.input.getBoundingClientRect();
        this.calendar.style.position = 'absolute';
        this.calendar.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        this.calendar.style.left = (rect.left + window.scrollX) + 'px';
        this.calendar.style.display = 'block';

        // Render current month
        this.renderCalendar();
    }

    hideCalendar() {
        this.calendar.style.display = 'none';
    }

    renderCalendar() {
        const { year, month } = this.currentJalaliDate;

        // Update header
        const monthYearDisplay = this.calendar.querySelector('.calendar-month-year');
        monthYearDisplay.textContent = `${this.monthNames[month - 1]} ${year}`;

        // Clear days
        const daysContainer = this.calendar.querySelector('.calendar-days');
        daysContainer.innerHTML = '';

        // Get first day of month
        const firstDay = this.jalaliToGregorian({ year, month, day: 1 });
        const firstDayOfWeek = new Date(firstDay.year, firstDay.month - 1, firstDay.day).getDay();
        // Adjust for Persian week (Saturday = 0)
        const adjustedFirstDay = firstDayOfWeek === 6 ? 0 : firstDayOfWeek + 1;

        // Get number of days in month
        const daysInMonth = this.getDaysInJalaliMonth(year, month);

        // Add empty cells for days before month starts
        for (let i = 0; i < adjustedFirstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            daysContainer.appendChild(emptyDay);
        }

        // Add days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;

            const currentDate = { year, month, day };

            // Check if this is today
            const today = this.getTodayJalali();
            if (this.isSameDate(currentDate, today)) {
                dayEl.classList.add('today');
            }

            // Check if this is selected date
            if (this.selectedDate && this.isSameDate(currentDate, this.selectedDate)) {
                dayEl.classList.add('selected');
            }

            // Check if date is disabled (before min date)
            if (this.minDate && this.isBeforeDate(currentDate, this.minDate)) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.addEventListener('click', () => this.selectDate(currentDate));
            }

            daysContainer.appendChild(dayEl);
        }
    }

    selectDate(jalaliDate) {
        this.selectedDate = jalaliDate;
        this.input.value = this.formatJalaliDate(jalaliDate);

        // Convert to Gregorian and set hidden input
        const gregorian = this.jalaliToGregorian(jalaliDate);
        const gregorianDate = `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;
        this.hiddenInput.value = gregorianDate;

        // Trigger change event
        this.hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));

        this.hideCalendar();
    }

    selectToday() {
        const today = this.getTodayJalali();
        this.currentJalaliDate = { ...today };
        this.selectDate(today);
        this.renderCalendar();
    }

    previousMonth() {
        if (this.currentJalaliDate.month === 1) {
            this.currentJalaliDate.month = 12;
            this.currentJalaliDate.year--;
        } else {
            this.currentJalaliDate.month--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        if (this.currentJalaliDate.month === 12) {
            this.currentJalaliDate.month = 1;
            this.currentJalaliDate.year++;
        } else {
            this.currentJalaliDate.month++;
        }
        this.renderCalendar();
    }

    handleManualInput() {
        const value = this.input.value.trim();

        // Allow typing without validation
        if (value.length === 0) {
            this.hiddenInput.value = '';
            this.selectedDate = null;
        }
    }

    validateManualInput() {
        const value = this.input.value.trim();

        if (value.length === 0) return;

        // Try to parse the date
        const match = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);

        if (!match) {
            this.showError('فرمت تاریخ صحیح نیست. مثال: 1404/11/23');
            this.input.value = '';
            this.hiddenInput.value = '';
            return;
        }

        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);

        // Validate ranges
        if (month < 1 || month > 12) {
            this.showError('ماه باید بین 1 تا 12 باشد');
            this.input.value = '';
            return;
        }

        const daysInMonth = this.getDaysInJalaliMonth(year, month);
        if (day < 1 || day > daysInMonth) {
            this.showError(`روز باید بین 1 تا ${daysInMonth} باشد`);
            this.input.value = '';
            return;
        }

        const jalaliDate = { year, month, day };

        // Check min date
        if (this.minDate && this.isBeforeDate(jalaliDate, this.minDate)) {
            this.showError('تاریخ انتخابی نمی‌تواند قبل از امروز باشد');
            this.input.value = '';
            return;
        }

        // Valid date - format and save
        this.selectedDate = jalaliDate;
        this.input.value = this.formatJalaliDate(jalaliDate);

        const gregorian = this.jalaliToGregorian(jalaliDate);
        const gregorianDate = `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;
        this.hiddenInput.value = gregorianDate;

        this.hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    showError(message) {
        // Create temporary error message
        const error = document.createElement('div');
        error.className = 'persian-datepicker-error';
        error.textContent = message;
        error.style.cssText = `
            position: absolute;
            background: #d66d6d;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.875rem;
            z-index: 10001;
            white-space: nowrap;
        `;

        const rect = this.input.getBoundingClientRect();
        error.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        error.style.left = (rect.left + window.scrollX) + 'px';

        document.body.appendChild(error);

        setTimeout(() => {
            error.remove();
        }, 3000);
    }

    // Helper functions
    formatJalaliDate(jalaliDate) {
        return `${jalaliDate.year}/${String(jalaliDate.month).padStart(2, '0')}/${String(jalaliDate.day).padStart(2, '0')}`;
    }

    getTodayJalali() {
        const today = new Date();
        return this.gregorianToJalali(today);
    }

    div(a, b) {
        return Math.floor(a / b);
    }

    mod(a, b) {
        return a - this.div(a, b) * b;
    }

    gregorianToJalali(date) {
        const gy = date.getFullYear();
        const gm = date.getMonth() + 1;
        const gd = date.getDate();

        let jy, jm, jd;

        let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        if (gy > 1600) {
            jy = 979;
            let tempGy = gy - 1600;
            jy += tempGy;
            let gy2 = (gm > 2) ? (gy + 1) : gy;
            let days = (365 * tempGy) + this.div(gy2 - 1600 + 3, 4) - this.div(gy2 - 1600 + 99, 100) +
                this.div(gy2 - 1600 + 399, 400) - 80 + gd + g_d_m[gm - 1];

            jy = 979 + 33 * this.div(days, 12053);
            days = this.mod(days, 12053);

            jy += 4 * this.div(days, 1461);
            days = this.mod(days, 1461);

            if (days > 365) {
                jy += this.div(days - 1, 365);
                days = this.mod(days - 1, 365);
            }

            if (days < 186) {
                jm = 1 + this.div(days, 31);
                jd = 1 + this.mod(days, 31);
            } else {
                jm = 7 + this.div(days - 186, 30);
                jd = 1 + this.mod(days - 186, 30);
            }
        } else {
            jy = 0;
            let tempGy = gy - 621;
            jy += tempGy;

            let gy2 = (gm > 2) ? (gy + 1) : gy;
            let days = (365 * tempGy) + this.div(gy2 - 621 + 3, 4) - 80 + gd + g_d_m[gm - 1];

            jy = 33 * this.div(days, 12053);
            days = this.mod(days, 12053);

            jy += 4 * this.div(days, 1461);
            days = this.mod(days, 1461);

            if (days > 365) {
                jy += this.div(days - 1, 365);
                days = this.mod(days - 1, 365);
            }

            if (days < 186) {
                jm = 1 + this.div(days, 31);
                jd = 1 + this.mod(days, 31);
            } else {
                jm = 7 + this.div(days - 186, 30);
                jd = 1 + this.mod(days - 186, 30);
            }
        }

        return { year: jy, month: jm, day: jd };
    }

    jalaliToGregorian(jalaliDate) {
        const jy = jalaliDate.year;
        const jm = jalaliDate.month;
        const jd = jalaliDate.day;

        let gy, gm, gd_result;

        if (jy > 979) {
            gy = 1600;
            let tempJy = jy - 979;

            let days = (365 * tempJy) + (this.div(tempJy, 33) * 8) + this.div(this.mod(tempJy, 33) + 3, 4) + 78 + jd +
                ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);

            gy += 400 * this.div(days, 146097);
            days = this.mod(days, 146097);

            if (days > 36524) {
                gy += 100 * this.div(days - 1, 36524);
                days = this.mod(days - 1, 36524);
                if (days >= 365) days++;
            }

            gy += 4 * this.div(days, 1461);
            days = this.mod(days, 1461);

            if (days > 365) {
                gy += this.div(days - 1, 365);
                days = this.mod(days - 1, 365);
            }

            let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

            for (gm = 0; gm < 13; gm++) {
                let v = sal_a[gm];
                if (days < v) break;
                days -= v;
            }

            gd_result = days + 1;
        } else {
            gy = 621;
            let days = (365 * jy) + this.div(jy, 33) * 8 + this.div(this.mod(jy, 33) + 3, 4) + jd +
                ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);

            gy += this.div(days, 365);
            days = this.mod(days, 365);

            let sal_a = [0, 31, ((gy % 4 === 0) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

            for (gm = 0; gm < 13; gm++) {
                let v = sal_a[gm];
                if (days < v) break;
                days -= v;
            }

            gd_result = days + 1;
        }

        return { year: gy, month: gm, day: gd_result };
    }

    getDaysInJalaliMonth(year, month) {
        if (month <= 6) return 31;
        if (month <= 11) return 30;

        // Check leap year for Esfand
        return this.isJalaliLeapYear(year) ? 30 : 29;
    }

    isJalaliLeapYear(year) {
        const breaks = [1, 5, 9, 13, 17, 22, 26, 30];
        const gy = year + 621;
        let jp = breaks[0];

        let jump = 0;
        for (let i = 1; i < breaks.length; i++) {
            const jm = breaks[i];
            jump = jm - jp;
            if (year < jm) break;
            jp = jm;
        }

        let n = year - jp;

        if (jump - n < 6) n = n - jump + ((jump + 4) / 33) * 33;

        let leap = (((n + 1) % 33) - 1) % 4 === 0;

        return leap;
    }

    isSameDate(date1, date2) {
        return date1.year === date2.year &&
            date1.month === date2.month &&
            date1.day === date2.day;
    }

    isBeforeDate(date1, date2) {
        if (date1.year < date2.year) return true;
        if (date1.year > date2.year) return false;
        if (date1.month < date2.month) return true;
        if (date1.month > date2.month) return false;
        return date1.day < date2.day;
    }
}

// Initialize all date pickers
function initPersianDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        new PersianDatePicker(input);
    });
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersianDatePickers);
} else {
    initPersianDatePickers();
}