export type PageViewRow = {
  id: number;
  visitor_id: string;
  path: string;
  referrer_domain: string | null;
  utm_source: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  entered_at: string;
  duration_ms: number | null;
};
