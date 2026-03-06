export const JOB_TYPES = [
    'Pharmacist',
    'Assistant',
    'PartTime',
    'Other',
] as const;

export type JobType = typeof JOB_TYPES[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
    Pharmacist: '薬剤師',
    Assistant: '薬剤助手',
    PartTime: '非常勤',
    Other: 'その他',
};

export const SHIFT_TYPES = [
    '休日(1日)',
    '休日(午前)',
    '休日(午後)',
    '希望休(1日)',
    '希望休(午前)',
    '希望休(午後)',
    '休日出勤(1日)',
    '休日出勤(午前)',
    '休日出勤(午後)',
    '出張(1日)',
    '出張(午前)',
    '出張(午後)',
    '特別休暇',
] as const;

export type ShiftType = typeof SHIFT_TYPES[number];

export const WARD_DAYS = {
    monday: '月曜日',
    tuesday: '火曜日',
    wednesday: '水曜日',
    thursday: '木曜日',
    friday: '金曜日',
    saturday: '土曜日',
} as const;
