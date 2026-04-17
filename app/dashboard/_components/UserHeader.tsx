'use client';

import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs, {breadcrumbsClasses} from '@mui/material/Breadcrumbs';
import {styled} from '@mui/material/styles';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CustomDatePicker from '@/components/mui-dashboard/dashboard/components/CustomDatePicker';
import MenuButton from '@/components/mui-dashboard/dashboard/components/MenuButton';
import ColorModeIconDropdown from '@/components/mui-dashboard/shared-theme/ColorModeIconDropdown';
import Search from '@/components/mui-dashboard/dashboard/components/Search';

const StyledBreadcrumbs = styled(Breadcrumbs)(({theme}) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center'
  }
}));

function UserBreadcrumbs() {
  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Link href="/" style={{textDecoration: 'none', color: 'inherit'}}>
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            transition: 'color 0.15s',
            '&:hover': {color: 'primary.main'}
          }}
        >
          მთავარი
        </Typography>
      </Link>
      <Typography variant="body1" sx={{color: 'text.primary', fontWeight: 600}}>
        მიმოხილვა
      </Typography>
    </StyledBreadcrumbs>
  );
}

export default function UserHeader() {
  return (
    <Stack
      direction="row"
      sx={{
        display: {xs: 'none', md: 'flex'},
        width: '100%',
        alignItems: {xs: 'flex-start', md: 'center'},
        justifyContent: 'space-between',
        maxWidth: {sm: '100%', md: '1700px'},
        pt: 1.5
      }}
      spacing={2}
    >
      <UserBreadcrumbs />
      <Stack direction="row" sx={{gap: 1}}>
        <Search />
        <CustomDatePicker />
        <MenuButton showBadge aria-label="Open notifications">
          <NotificationsRoundedIcon />
        </MenuButton>
        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}
