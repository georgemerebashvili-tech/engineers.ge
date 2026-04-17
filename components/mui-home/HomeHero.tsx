'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import EngineeringRoundedIcon from '@mui/icons-material/EngineeringRounded';

export default function HomeHero() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 6, md: 10 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundImage: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 50% 0%, rgba(31,111,212,0.18), transparent 60%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(31,111,212,0.08), transparent 60%)',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
            <Chip
              icon={<EngineeringRoundedIcon />}
              label="BETA · EN 12831 · ISO 6946 · ASHRAE"
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start', fontFamily: 'monospace', fontSize: 11 }}
            />
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontSize: { xs: 28, md: 40 },
                lineHeight: 1.15,
              }}
            >
              საინჟინრო ხელსაწყოები და ცოდნა{' '}
              <Box component="span" sx={{ color: 'primary.main' }}>
                ქართველი ინჟინრებისთვის
              </Box>
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: 15 }}>
              HVAC, თბოდანაკარგები, კედლის თბოგამტარობა და ხმაურდამხშობი სელექშენი —
              უფასო ონლაინ კალკულატორები EN 12831, ISO 6946 და ASHRAE სტანდარტებით.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                href="#calculators"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
              >
                კალკულატორები
              </Button>
              <Button
                href="#about"
                variant="outlined"
                size="large"
                startIcon={<CalculateRoundedIcon />}
              >
                როგორ მუშაობს
              </Button>
            </Stack>
          </Stack>

          <Stack
            spacing={1.5}
            sx={{
              width: { xs: '100%', md: 340 },
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: 'background.paper',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              # EN 12831 · Q_heat
            </Typography>
            <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
{`Φ_HL,i = Φ_T,i + Φ_V,i

Φ_T,i = Σ (A·U·(θ_int − θ_e)·f)
Φ_V,i = 0.34·V̇·(θ_int − θ_e)

— — — — — — — — — —
შენობა:      სახლი, თბილისი
T_ext:       −5 °C
T_int:       +20 °C
A_env:       286 m²
U_avg:       0.42 W/m²K
V̇:          145 m³/h
— — — — — — — — — —
Φ_HL:        7.84 kW
`}
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
