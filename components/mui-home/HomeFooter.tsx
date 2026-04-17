'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

export default function HomeFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>engineers</Typography>
            <Box
              aria-hidden
              sx={{
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '8px solid',
                borderLeftColor: 'primary.main',
              }}
            />
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: 'text.secondary' }}>
              .ge
            </Typography>
          </Stack>
          <Stack direction="row" spacing={3}>
            <Link href="#about" color="text.secondary" underline="hover" variant="body2">
              შესახებ
            </Link>
            <Link href="/admin" color="text.secondary" underline="hover" variant="body2">
              Admin
            </Link>
            <Link href="/dashboard" color="text.secondary" underline="hover" variant="body2">
              Dashboard
            </Link>
          </Stack>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
          >
            © {new Date().getFullYear()} engineers.ge
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
