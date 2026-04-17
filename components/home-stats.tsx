'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AppTheme from './mui-dashboard/shared-theme/AppTheme';
import StatCard from './mui-dashboard/dashboard/components/StatCard';
import PageViewsBarChart from './mui-dashboard/dashboard/components/PageViewsBarChart';
import {Container} from './container';
import {CALCULATORS} from '@/lib/calculators';
import {formatGel} from '@/lib/hero-ads';

const statCards = [
  {
    title: 'უნიკალური ვიზიტორები',
    value: '14k',
    interval: 'ბოლო 30 დღე',
    trend: 'up' as const,
    data: [
      200, 240, 220, 260, 240, 380, 300, 340, 380, 420, 400, 460, 480, 520, 540,
      560, 600, 640, 680, 720, 760, 800, 820, 840, 860, 890, 910, 940, 980, 1020,
    ],
  },
  {
    title: 'კალკულაციები',
    value: '2,418',
    interval: 'ბოლო 30 დღე',
    trend: 'up' as const,
    data: [
      40, 52, 48, 61, 55, 70, 63, 58, 72, 66, 80, 75, 82, 78, 85, 91, 86, 94, 88, 102,
      96, 108, 104, 115, 110, 120, 118, 125, 130, 138,
    ],
  },
  {
    title: 'აქტიური კალკულატორი',
    value: `${CALCULATORS.length}`,
    interval: 'ხელმისაწვდომი',
    trend: 'neutral' as const,
    data: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  },
];

// Mock usage ranking (replace with Supabase `page_views` aggregation once live).
const calcUsage = [
  {slug: 'heat-loss', count: 892, pct: 37},
  {slug: 'wall-thermal', count: 523, pct: 22},
  {slug: 'hvac', count: 412, pct: 17},
  {slug: 'silencer', count: 256, pct: 11},
  {slug: 'ahu-ashrae', count: 198, pct: 8},
  {slug: 'silencer-kaya', count: 85, pct: 4},
  {slug: 'procurement', count: 52, pct: 2},
] as const;

export function HomeStats() {
  const topCalc = CALCULATORS.find((c) => c.slug === calcUsage[0].slug);

  return (
    <AppTheme>
      <Box
        component="section"
        sx={{
          py: {xs: 4, md: 5},
          bgcolor: 'background.default',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container>
          <Stack spacing={0.5} sx={{mb: 3}}>
            <Typography variant="h5" component="h2" sx={{fontWeight: 700}}>
              ხშირად გამოყენებადი კალკულატორები
            </Typography>
          </Stack>

          <Grid container spacing={2} sx={{mb: 2}}>
            {statCards.map((c, i) => (
              <Grid key={i} size={{xs: 12, sm: 6, lg: 3}}>
                <StatCard {...c} />
              </Grid>
            ))}
            <Grid size={{xs: 12, sm: 6, lg: 3}}>
              <Card variant="outlined" sx={{height: '100%'}}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    ყველაზე პოპულარული
                  </Typography>
                  <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1}}>
                    <Box component="span" sx={{fontSize: 22}} aria-hidden>
                      {topCalc?.icon}
                    </Box>
                    <Typography variant="h5" component="p" sx={{fontWeight: 700}}>
                      {topCalc?.title ?? 'თბოდანაკარგი'}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={<TrendingUpRoundedIcon />}
                    label={`${calcUsage[0].count} / 30 დღე`}
                    color="success"
                    variant="outlined"
                  />
                  <Typography
                    variant="caption"
                    sx={{display: 'block', mt: 1.5, color: 'text.secondary'}}
                  >
                    {topCalc?.standard ?? ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{xs: 12, md: 7}}>
              <PageViewsBarChart />
            </Grid>
            <Grid size={{xs: 12, md: 5}}>
              <Card variant="outlined" sx={{height: '100%'}}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    გამოყენების რეიტინგი
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{mb: 2, display: 'block'}}>
                    ბოლო 30 დღის განმავლობაში
                  </Typography>
                  <Stack spacing={1.75}>
                    {calcUsage.map((u, i) => {
                      const calc = CALCULATORS.find((c) => c.slug === u.slug);
                      return (
                        <Box key={u.slug}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 0.5,
                            }}
                          >
                            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1}}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: 'text.secondary',
                                  minWidth: 20,
                                }}
                              >
                                #{String(i + 1).padStart(2, '0')}
                              </Typography>
                              <Box component="span" sx={{fontSize: 14}} aria-hidden>
                                {calc?.icon}
                              </Box>
                              <Typography variant="body2" sx={{fontWeight: 500}}>
                                {calc?.title ?? u.slug}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{fontFamily: 'monospace', color: 'text.secondary'}}
                            >
                              {formatGel(u.count)}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              height: 4,
                              bgcolor: 'action.hover',
                              borderRadius: 2,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${u.pct}%`,
                                bgcolor: i < 3 ? 'primary.main' : 'primary.light',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </AppTheme>
  );
}
