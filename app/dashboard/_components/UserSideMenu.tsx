'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {styled} from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import MuiDrawer, {drawerClasses} from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuContent from '@/components/mui-dashboard/dashboard/components/MenuContent';
import CardAlert from '@/components/mui-dashboard/dashboard/components/CardAlert';
import OptionsMenu from '@/components/mui-dashboard/dashboard/components/OptionsMenu';
import {RegistrationTrigger} from '@/components/registration-flow';
import {getStoredUser, type StoredUser} from '@/lib/user-session';

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: 'border-box'
  }
});

function UserProfileCard() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    const onChange = () => setUser(getStoredUser());
    window.addEventListener('eng_user_change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('eng_user_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  if (!mounted) {
    return (
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 68
        }}
      />
    );
  }

  if (!user) {
    return (
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <RegistrationTrigger
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-bdr bg-sur px-3 py-2 text-xs font-semibold text-navy transition-colors hover:border-blue hover:text-blue"
          label="რეგისტრაცია"
        />
      </Box>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <Box
      sx={{
        p: 2,
        gap: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Avatar sizes="small" alt={user.name} sx={{width: 36, height: 36}}>
        {initial}
      </Avatar>
      <Box sx={{mr: 'auto', minWidth: 0}}>
        <Typography
          variant="body2"
          sx={{fontWeight: 500, lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
        >
          {user.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block'}}
        >
          {user.email}
        </Typography>
      </Box>
      <OptionsMenu />
    </Box>
  );
}

export default function UserSideMenu() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: {xs: 'none', md: 'block'},
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: 'background.paper'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pt: 2.5,
          pb: 1.5
        }}
      >
        <Link href="/" style={{textDecoration: 'none'}} aria-label="მთავარზე დაბრუნება">
          <Typography
            component="span"
            sx={{
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              transition: 'opacity 0.15s',
              '&:hover': {opacity: 0.7}
            }}
          >
            engineers
            <Typography
              component="span"
              sx={{fontSize: 'inherit', fontWeight: 700, color: 'text.secondary'}}
            >
              .ge
            </Typography>
          </Typography>
        </Link>
      </Box>
      <UserProfileCard />
      <Box
        sx={{
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <MenuContent />
        <CardAlert />
      </Box>
    </Drawer>
  );
}
