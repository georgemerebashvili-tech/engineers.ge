'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { CALCULATORS } from '@/lib/calculators';

export default function HomeCalculators() {
  return (
    <Box
      component="section"
      id="calculators"
      sx={{
        py: { xs: 5, md: 8 },
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: (theme) =>
          theme.vars
            ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.5)`
            : theme.palette.background.default,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          spacing={1}
          sx={{ mb: 3 }}
        >
          <Stack spacing={0.5}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontFamily: 'monospace', letterSpacing: '0.08em' }}
            >
              ხელსაწყოები
            </Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              საინჟინრო კალკულატორები
            </Typography>
          </Stack>
          <Chip
            label={`სულ · ${CALCULATORS.length}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
          />
        </Stack>

        <Grid container spacing={2}>
          {CALCULATORS.map((c, i) => (
            <Grid key={c.slug} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea href={`/calc/${c.slug}`} sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1.5 }}
                    >
                      <Chip
                        label={`#${String(i + 1).padStart(2, '0')}`}
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          backgroundColor: 'action.hover',
                        }}
                      />
                      <Box component="span" sx={{ fontSize: 22 }} aria-hidden>
                        {c.icon}
                      </Box>
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {c.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        mb: 2,
                        minHeight: 40,
                      }}
                    >
                      {c.desc}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={c.tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: 10 }}
                        />
                        {c.standard && (
                          <Chip
                            label={c.standard}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 10,
                              display: { xs: 'none', md: 'inline-flex' },
                            }}
                          />
                        )}
                      </Stack>
                      <ArrowForwardRoundedIcon
                        fontSize="small"
                        sx={{ color: 'text.secondary' }}
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
