import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import { Box, IconButton } from '@mui/material';
import { useEffect, useState } from 'react';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';

function formatInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + deltaDays);
  return formatInputDate(base);
}

export function CalendarDateNavigator({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const [dateDraft, setDateDraft] = useState(() => fromInputDateToDisplay(date));

  useEffect(() => {
    setDateDraft(fromInputDateToDisplay(date));
  }, [date]);

  const handleDateDraftChange = (nextDate: string) => {
    setDateDraft(nextDate);
    const isoDate = toInputDateFromDisplay(nextDate);
    if (isoDate) onDateChange(isoDate);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px', flexWrap: 'nowrap' }}>
      <IconButton color="primary" aria-label="Précédent" onClick={() => onDateChange(shiftDate(date, -1))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <ChevronLeftRoundedIcon />
      </IconButton>
      <DateInputField label="Date" value={dateDraft} onChange={handleDateDraftChange} calendarAriaLabel="Calendrier" sx={{ width: { xs: 162, sm: 162 }, minWidth: 162, maxWidth: 162, flex: '0 0 auto' }} />
      <IconButton color="primary" aria-label="Aujourd'hui" onClick={() => onDateChange(formatInputDate(new Date()))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <TodayRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <IconButton color="primary" aria-label="Suivant" onClick={() => onDateChange(shiftDate(date, 1))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <ChevronRightRoundedIcon />
      </IconButton>
    </Box>
  );
}