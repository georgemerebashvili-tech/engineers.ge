'use client';

import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppTheme from '../mui-dashboard/shared-theme/AppTheme';
import HomeAppBar from './HomeAppBar';
import HomeHero from './HomeHero';
import HomeBanners from './HomeBanners';
import HomeCalculators from './HomeCalculators';
import HomeFooter from './HomeFooter';

export default function Home() {
  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <HomeAppBar />
        <Box component="main" sx={{ flex: 1 }}>
          <HomeHero />
          <HomeBanners />
          <HomeCalculators />
        </Box>
        <HomeFooter />
      </Box>
    </AppTheme>
  );
}
