'use client';

import {useMemo, useState} from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CssBaseline from '@mui/material/CssBaseline';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ViewCarouselRoundedIcon from '@mui/icons-material/ViewCarouselRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AppTheme from '@/components/mui-dashboard/shared-theme/AppTheme';
import StatCard from '@/components/mui-dashboard/dashboard/components/StatCard';
import PageViewsBarChart from '@/components/mui-dashboard/dashboard/components/PageViewsBarChart';
import SessionsChart from '@/components/mui-dashboard/dashboard/components/SessionsChart';
import HighlightedCard from '@/components/mui-dashboard/dashboard/components/HighlightedCard';
import {HeroTreemap} from '@/components/hero-treemap';
import {HeroAdsForm} from '@/app/admin/(authed)/tiles/form';
import {
  HERO_OWNER_NAME,
  formatGel,
  formatOccupiedUntil,
  type HeroAdSlot
} from '@/lib/hero-ads';

type Props = {slots: HeroAdSlot[]};

function TabPanel({value, index, children}: {value: number; index: number; children: React.ReactNode}) {
  if (value !== index) return null;
  return (
    <Box sx={{py: 3}} role="tabpanel">
      {children}
    </Box>
  );
}

export function BannersPanel({slots}: Props) {
  const [tab, setTab] = useState(0);

  const adSlots = useMemo(() => slots.filter((s) => s.is_ad_slot), [slots]);
  const totalPrice = useMemo(
    () => adSlots.reduce((sum, s) => sum + (s.price_gel ?? 0), 0),
    [adSlots]
  );
  const occupiedCount = useMemo(
    () => adSlots.filter((s) => !!s.occupied_until).length,
    [adSlots]
  );
  const freeCount = adSlots.length - occupiedCount;
  const utilization = adSlots.length > 0 ? Math.round((occupiedCount / adSlots.length) * 100) : 0;

  const statCards = [
    {
      title: 'სარეკლამო სლოტები',
      value: `${adSlots.length}`,
      interval: 'hero treemap',
      trend: 'neutral' as const,
      data: Array(30).fill(adSlots.length)
    },
    {
      title: 'დაკავებული',
      value: `${occupiedCount}/${adSlots.length}`,
      interval: `${utilization}% დატვირთულობა`,
      trend: occupiedCount > freeCount ? ('up' as const) : ('neutral' as const),
      data: [3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, occupiedCount]
    },
    {
      title: 'თავისუფალი',
      value: `${freeCount}`,
      interval: 'მზადაა განთავსებისთვის',
      trend: freeCount > 0 ? ('up' as const) : ('down' as const),
      data: Array(30).fill(freeCount)
    },
    {
      title: 'შემოსავალი / თვე',
      value: `${formatGel(totalPrice)} ₾`,
      interval: 'ყველა slot-ის ფასი',
      trend: 'up' as const,
      data: [
        400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1500, 1700, 1900, 2100, 2300, 2500,
        2800, 3100, 3400, 3700, 4000, 4200, 4400, 4600, 4800, 4900, 5000, 5100, 5150, totalPrice
      ]
    }
  ];

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <Box sx={{width: '100%'}}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap'
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ViewCarouselRoundedIcon />
          </Box>
          <Box sx={{flexGrow: 1, minWidth: 0}}>
            <Typography variant="h5" sx={{fontWeight: 700}}>
              ბანერების მართვა
            </Typography>
            <Typography variant="body2" sx={{color: 'text.secondary'}}>
              Hero ads, ფასები, დაკავების ვადა, სიმულაცია და სტატისტიკა — ყველაფერი ერთ ადგილას.
            </Typography>
          </Box>
          <Chip
            label={`Owner: ${HERO_OWNER_NAME}`}
            color="primary"
            variant="outlined"
            sx={{fontWeight: 600}}
          />
        </Box>

        <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="banner management tabs"
          >
            <Tab icon={<DashboardRoundedIcon />} iconPosition="start" label="მიმოხილვა" />
            <Tab icon={<TuneRoundedIcon />} iconPosition="start" label="Hero Ads მართვა" />
            <Tab icon={<ViewCarouselRoundedIcon />} iconPosition="start" label="ბანერების ცხრილი" />
            <Tab icon={<AnalyticsRoundedIcon />} iconPosition="start" label="სტატისტიკა" />
            <Tab icon={<VisibilityRoundedIcon />} iconPosition="start" label="Preview" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2} sx={{mb: 2}}>
            {statCards.map((card, i) => (
              <Grid key={i} size={{xs: 12, sm: 6, lg: 3}}>
                <StatCard {...card} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{xs: 12, md: 6}}>
              <SessionsChart />
            </Grid>
            <Grid size={{xs: 12, md: 6}}>
              <HighlightedCard />
            </Grid>
            <Grid size={{xs: 12}}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    ცოცხალი preview · მთავარი გვერდი
                  </Typography>
                  <Box sx={{mt: 2}}>
                    <HeroTreemap slots={slots} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{mb: 2, color: 'text.secondary'}}>
                აირჩიე slot → შეცვალე ფასი, ვადა, სურათი → Live სიმულაცია → შენახვა.
              </Typography>
              <Divider sx={{mb: 3}} />
              <Box
                sx={{
                  '& input, & select': {
                    color: 'text.primary'
                  }
                }}
              >
                <HeroAdsForm initial={slots} />
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{mb: 2}}>
                ყველა სლოტი · {adSlots.length} სარეკლამო · {slots.length - adSlots.length} ბრენდული
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>სლოტი</TableCell>
                      <TableCell>ზომა</TableCell>
                      <TableCell>ტიპი</TableCell>
                      <TableCell>კლიენტი</TableCell>
                      <TableCell align="right">ფასი / თვე</TableCell>
                      <TableCell>ვადა</TableCell>
                      <TableCell>სტატუსი</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slots.map((slot) => {
                      const busy = slot.is_ad_slot && !!slot.occupied_until;
                      return (
                        <TableRow key={slot.slot_key} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{fontWeight: 600}}>
                              {slot.display_name}
                            </Typography>
                            <Typography variant="caption" sx={{color: 'text.secondary'}}>
                              {slot.slot_key}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{fontFamily: 'monospace', fontSize: '0.75rem'}}>
                            {slot.size_hint}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={slot.is_ad_slot ? 'Ad slot' : 'Brand'}
                              color={slot.is_ad_slot ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{slot.client_name || '—'}</TableCell>
                          <TableCell align="right" sx={{fontFamily: 'monospace'}}>
                            {slot.price_gel > 0 ? `${formatGel(slot.price_gel)} ₾` : '—'}
                          </TableCell>
                          <TableCell sx={{fontFamily: 'monospace', fontSize: '0.75rem'}}>
                            {formatOccupiedUntil(slot.occupied_until)}
                          </TableCell>
                          <TableCell>
                            {slot.is_ad_slot ? (
                              <Chip
                                size="small"
                                label={busy ? 'დაკავებული' : 'თავისუფალი'}
                                color={busy ? 'warning' : 'success'}
                              />
                            ) : (
                              <Chip size="small" label="—" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Grid container spacing={2}>
            <Grid size={{xs: 12, md: 8}}>
              <PageViewsBarChart />
            </Grid>
            <Grid size={{xs: 12, md: 4}}>
              <Card variant="outlined" sx={{height: '100%'}}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    ყველაზე ძვირი slot
                  </Typography>
                  <Typography variant="h4" sx={{fontWeight: 700, mt: 1}}>
                    {adSlots.length > 0
                      ? `${formatGel(Math.max(...adSlots.map((s) => s.price_gel)))} ₾`
                      : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{color: 'text.secondary'}}>
                    {adSlots.length > 0
                      ? adSlots.reduce((top, s) => (s.price_gel > top.price_gel ? s : top)).display_name
                      : ''}
                  </Typography>
                  <Divider sx={{my: 2}} />
                  <Typography variant="subtitle2" gutterBottom>
                    საშუალო ფასი
                  </Typography>
                  <Typography variant="h4" sx={{fontWeight: 700, mt: 1}}>
                    {adSlots.length > 0
                      ? `${formatGel(Math.round(totalPrice / adSlots.length))} ₾`
                      : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{color: 'text.secondary'}}>
                    {adSlots.length} slot-ზე
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{xs: 12}}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    ფასების განაწილება
                  </Typography>
                  <Divider sx={{mb: 2}} />
                  <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
                    {adSlots
                      .slice()
                      .sort((a, b) => b.price_gel - a.price_gel)
                      .map((slot) => {
                        const max = Math.max(...adSlots.map((s) => s.price_gel), 1);
                        const pct = Math.round((slot.price_gel / max) * 100);
                        return (
                          <Box key={slot.slot_key}>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 0.5}}>
                              <Typography variant="body2" sx={{fontWeight: 500}}>
                                {slot.display_name}
                              </Typography>
                              <Typography variant="caption" sx={{fontFamily: 'monospace', color: 'text.secondary'}}>
                                {formatGel(slot.price_gel)} ₾
                              </Typography>
                            </Box>
                            <Box sx={{height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden'}}>
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  bgcolor: 'primary.main',
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                ცოცხალი preview · ზუსტად ისე, როგორც ვიზიტორს უჩანდება მთავარ გვერდზე
              </Typography>
              <Divider sx={{mb: 3}} />
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2
                }}
              >
                <HeroTreemap slots={slots} />
              </Box>
              <Typography variant="caption" sx={{color: 'text.secondary', mt: 2, display: 'block'}}>
                Owner ნიშანი ({HERO_OWNER_NAME}) ფიქსირებულად ჩანს ყველა სარეკლამო slot-ზე.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    </AppTheme>
  );
}
