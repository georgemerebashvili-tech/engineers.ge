'use client';

import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/x-charts/themeAugmentation';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import {alpha} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppNavbar from '@/components/mui-dashboard/dashboard/components/AppNavbar';
import AppTheme from '@/components/mui-dashboard/shared-theme/AppTheme';
import UserHeader from './UserHeader';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations
} from '@/components/mui-dashboard/dashboard/theme/customizations';
import UserSideMenu from './UserSideMenu';
import UserMainGrid from './UserMainGrid';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations
};

export default function UserDashboard(props: {disableCustomTheme?: boolean}) {
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{display: 'flex'}}>
        <UserSideMenu />
        <AppNavbar />
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto'
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 5,
              mt: {xs: 8, md: 0}
            }}
          >
            <UserHeader />
            <UserMainGrid />
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}
