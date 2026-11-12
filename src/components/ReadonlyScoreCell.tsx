import { Box, Typography } from '@mui/material';
import type { MatchGridBaseRow } from './matchGridColumns';

export function ReadonlyScoreCell({ row, value }: { row: MatchGridBaseRow; value: string }) {
  const tabDom = Number(row.TABDOM ?? 0);
  const tabExt = Number(row.TABEXT ?? 0);

  return (
    <Box sx={{ width: '100%', textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {tabDom > 0 ? <Typography component="sup" sx={{ fontSize: 9, mr: 0.3 }}>{tabDom}</Typography> : null}
      {value}
      {tabExt > 0 ? <Typography component="sup" sx={{ fontSize: 9, ml: 0.3 }}>{tabExt}</Typography> : null}
    </Box>
  );
}
