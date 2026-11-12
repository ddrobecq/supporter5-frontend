import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import { Box, IconButton } from '@mui/material';
import { DateInputField } from '../../components/DateInputField';
import { toLocalIsoDate } from '../../components/dateUtils';

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + deltaDays);
  return toLocalIsoDate(base);
}

export function CalendarDateNavigator({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  // Clearing the field ('') is ignored: the navigator always needs a date.
  const handleDateChange = (nextDate: string) => {
    if (nextDate) onDateChange(nextDate);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px', flexWrap: 'nowrap' }}>
      <IconButton color="primary" aria-label="Précédent" onClick={() => onDateChange(shiftDate(date, -1))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <ChevronLeftRoundedIcon />
      </IconButton>
      <DateInputField label="Date" value={date} onChange={handleDateChange} calendarAriaLabel="Calendrier" sx={{ width: { xs: 162, sm: 162 }, minWidth: 162, maxWidth: 162, flex: '0 0 auto' }} />
      <IconButton color="primary" aria-label="Aujourd'hui" onClick={() => onDateChange(toLocalIsoDate(new Date()))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <TodayRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <IconButton color="primary" aria-label="Suivant" onClick={() => onDateChange(shiftDate(date, 1))} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}>
        <ChevronRightRoundedIcon />
      </IconButton>
    </Box>
  );
}