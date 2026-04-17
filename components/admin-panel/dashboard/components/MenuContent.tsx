import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import ViewCarouselRoundedIcon from '@mui/icons-material/ViewCarouselRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';

const mainListItems = [
  { text: 'მიმოხილვა', icon: <HomeRoundedIcon /> },
  { text: 'ანალიტიკა', icon: <AnalyticsRoundedIcon /> },
  { text: 'ვიზიტორები', icon: <PeopleRoundedIcon /> },
  { text: 'კალკულატორები', icon: <CalculateRoundedIcon /> },
  { text: 'ბანერები', icon: <ViewCarouselRoundedIcon /> },
];

const secondaryListItems = [
  { text: 'პარამეტრები', icon: <SettingsRoundedIcon /> },
  { text: 'შესახებ', icon: <InfoRoundedIcon /> },
  { text: 'დახმარება', icon: <HelpRoundedIcon /> },
];

export default function MenuContent() {
  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {mainListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton selected={index === 0}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <List dense>
        {secondaryListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
