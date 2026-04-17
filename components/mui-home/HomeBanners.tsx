'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

const BANNERS: Banner[] = [
  {
    id: '1',
    title: 'სპეციალური შეთავაზება',
    subtitle: 'HVAC კონსულტაცია და სელექცია',
    image: 'https://placehold.co/1200x600/1a3a6b/ffffff/png?text=engineers.ge',
    href: '#',
  },
  {
    id: '2',
    title: 'ძალიან მალე სიახლე',
    subtitle: 'ახალი კალკულატორი გამოდის',
    image: 'https://placehold.co/1200x600/1f6fd4/ffffff/png?text=NEW+TOOL',
    href: '#',
  },
  {
    id: '3',
    title: 'EN 12831 · ISO 6946',
    subtitle: 'ASHRAE სტანდარტული რეპორტები',
    image: 'https://placehold.co/1200x600/c05010/ffffff/png?text=STANDARDS',
    href: '#',
  },
];

export default function HomeBanners() {
  return (
    <Box component="section" id="banners" sx={{ py: { xs: 5, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontFamily: 'monospace', letterSpacing: '0.08em' }}
          >
            სიახლეები
          </Typography>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            რა ხდება engineers.ge-ზე
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {BANNERS.map((b) => (
            <Grid key={b.id} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea href={b.href}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={b.image}
                    alt={b.title}
                  />
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {b.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {b.subtitle}
                    </Typography>
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
