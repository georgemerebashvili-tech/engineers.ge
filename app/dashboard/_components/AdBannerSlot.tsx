'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {Megaphone} from 'lucide-react';

export default function AdBannerSlot({index}: {index: number}) {
  return (
    <Box
      sx={{
        flex: '1 1 180px',
        minWidth: 160,
        height: 96,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        color: 'text.secondary',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
          color: 'primary.main'
        }
      }}
      role="region"
      aria-label={`რეკლამის სლოტი ${index}`}
    >
      <Megaphone size={16} />
      <Typography variant="caption" sx={{fontWeight: 600, letterSpacing: 0.5}}>
        რეკლამა {index}
      </Typography>
      <Typography variant="caption" sx={{fontSize: 10, opacity: 0.7}}>
        320 × 96
      </Typography>
    </Box>
  );
}
