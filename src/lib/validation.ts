
interface Shift {
    id: number;
    employeeId: number;
    date: string;
    type: string;
}

export const getRestCount = (type: string) => {
    // Full Rest (+1)
    if (type === '休み(終日)' || type === '希望休み(終日)') return 1;

    // Half Rest (+0.5)
    const halfRestTypes = [
        '午前休み', '午後休み',
        '希望午前休み', '希望午後休み',
        '休日出勤(午前)', '休日出勤(午後)', '出勤(午前)', '出勤(午後)',
        '出張(午前)', '出張(午後)'
    ];
    if (halfRestTypes.includes(type)) return 0.5;

    // Special Leave (+0)
    if (type === '特別休暇') return 0;

    // Full Work / Trip (+0)
    if (type === '休日出勤(1日)' || type === '出勤(1日)' || type === '出張(終日)') return 0;

    // Fallbacks
    if (type.includes('午前') || type.includes('午後')) return 0.5;
    if (type.includes('休み')) return 1;

    return 0;
};

/**
 * Checks if an employee is effectively absent on a given date.
 * Returns true if:
 * 1. They have an explicit Full Rest shift.
 * 2. They have NO shift, BUT it is a "Holiday Work" day (implicitly rest for others).
 */
export const isEmployeeAbsent = (
    employeeId: number,
    dateStr: string,
    shifts: Shift[]
): boolean => {
    const shift = shifts.find(s => s.employeeId === employeeId && s.date === dateStr);

    if (shift) {
        return getRestCount(shift.type) === 1;
    }

    // Implicit Rest Logic:
    // If NO shift exists for this employee, check if ANYONE else has a "Holiday Work" shift.
    // If so, it's treated as a holiday/rest for this employee.
    const hasHolidayWork = shifts.some(s =>
        s.date === dateStr &&
        (s.type.includes('休日出勤') || s.type.includes('出勤'))
    );

    return hasHolidayWork;
};
