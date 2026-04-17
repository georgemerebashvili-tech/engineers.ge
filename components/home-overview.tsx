'use client';

import {AppRouterCacheProvider} from '@mui/material-nextjs/v16-appRouter';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import AppTheme from './mui-dashboard/shared-theme/AppTheme';
import StatCard, {type StatCardProps} from './mui-dashboard/dashboard/components/StatCard';
import HighlightedCard from './mui-dashboard/dashboard/components/HighlightedCard';
import PageViewsBarChart from './mui-dashboard/dashboard/components/PageViewsBarChart';
import {chartsCustomizations} from './mui-dashboard/dashboard/theme/customizations';

const xThemeComponents = {...chartsCustomizations};

const data: StatCardProps[] = [
  {
    title: 'Users',
    value: '14k',
    interval: 'Last 30 days',
    trend: 'up',
    data: [
      200, 24, 220, 260, 240, 380, 100, 240, 280, 240, 300, 340, 320, 360, 340, 380,
      360, 400, 380, 420, 400, 640, 340, 460, 440, 480, 460, 600, 880, 920
    ]
  },
  {
    title: 'Conversions',
    value: '325',
    interval: 'Last 30 days',
    trend: 'down',
    data: [
      1640, 1250, 970, 1130, 1050, 900, 720, 1080, 900, 450, 920, 820, 840, 600, 820,
      780, 800, 760, 380, 740, 660, 620, 840, 500, 520, 480, 400, 360, 300, 220
    ]
  },
  {
    title: 'Event count',
    value: '200k',
    interval: 'Last 30 days',
    trend: 'neutral',
    data: [
      500, 400, 510, 530, 520, 600, 530, 520, 510, 730, 520, 510, 530, 620, 510, 530,
      520, 410, 530, 520, 610, 530, 520, 610, 530, 420, 510, 430, 520, 510
    ]
  }
];

const compactSx = {
  '& .MuiCard-root .MuiCardContent-root': {
    p: 1.25,
    '&:last-child': {pb: 1.25}
  },
  '& .MuiTypography-h4': {fontSize: '1.125rem', lineHeight: 1.2},
  '& .MuiTypography-subtitle2': {fontSize: '0.75rem'},
  '& .MuiTypography-caption': {fontSize: '0.65rem'},
  '& .MuiChip-sizeSmall': {height: 18, fontSize: '0.65rem'},
  '& .MuiSvgIcon-root': {fontSize: '1rem'},
  '& .MuiButton-root': {fontSize: '0.7rem', py: 0.25}
} as const;

export function HomeOverview() {
  return (
    <AppRouterCacheProvider>
      <AppTheme themeComponents={xThemeComponents}>
        <Box sx={{width: '100%', ...compactSx}}>
          <Grid container spacing={1.5} columns={12} sx={{mb: 1.5}}>
            {data.map((card, index) => (
              <Grid key={index} size={{xs: 12, sm: 6, lg: 3}}>
                <Box sx={{'& > .MuiCard-root > .MuiCardContent-root > .MuiStack-root > .MuiBox-root': {height: 28}}}>
                  <StatCard {...card} />
                </Box>
              </Grid>
            ))}
            <Grid size={{xs: 12, sm: 6, lg: 3}}>
              <HighlightedCard />
            </Grid>
          </Grid>
          <Box
            sx={{
              '& .MuiChartsSurface-root': {height: '160px !important'},
              '& .MuiCardContent-root .MuiStack-root:first-of-type': {mb: 0.5}
            }}
          >
            <PageViewsBarChart />
          </Box>
        </Box>
      </AppTheme>
    </AppRouterCacheProvider>
  );
}
