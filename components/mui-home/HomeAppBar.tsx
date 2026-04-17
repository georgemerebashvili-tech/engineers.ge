'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ColorModeIconDropdown from '../mui-dashboard/shared-theme/ColorModeIconDropdown';

const navItems = [
  { label: 'კალკულატორები', href: '#calculators' },
  { label: 'ბანერები', href: '#banners' },
  { label: 'შესახებ', href: '#about' },
];

export default function HomeAppBar() {
  const [open, setOpen] = React.useState(false);

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        backgroundColor: (theme) =>
          theme.vars
            ? `rgba(${theme.vars.palette.background.paperChannel} / 0.85)`
            : theme.palette.background.paper,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 } }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ flexGrow: 1 }}
          >
            <Typography
              component="a"
              href="/"
              sx={{
                fontSize: { xs: 20, md: 22 },
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'text.primary',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              engineers
              <Box
                aria-hidden
                sx={{
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '10px solid',
                  borderLeftColor: 'primary.main',
                }}
              />
              <Box component="span" sx={{ color: 'text.secondary' }}>
                .ge
              </Box>
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}
          >
            {navItems.map((item) => (
              <Button
                key={item.href}
                href={item.href}
                color="inherit"
                size="small"
                sx={{ fontWeight: 500, color: 'text.secondary' }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <ColorModeIconDropdown />
            <IconButton
              onClick={() => setOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              aria-label="menu"
            >
              <MenuRoundedIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260, pt: 1 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 1 }}>
            <IconButton onClick={() => setOpen(false)} aria-label="close">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.href}
                component="a"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
