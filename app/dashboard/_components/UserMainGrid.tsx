'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AdBannerSlot from './AdBannerSlot';

const AD_SLOTS = [1, 2, 3, 4, 5];

export default function UserMainGrid() {
  return (
    <Box sx={{width: '100%', maxWidth: {sm: '100%', md: '1700px'}}}>
      <Typography component="h2" variant="h6" sx={{mb: 2}}>
        სარეკლამო სივრცე
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        {AD_SLOTS.map((i) => (
          <AdBannerSlot key={i} index={i} />
        ))}
      </Box>
    </Box>
  );
}
