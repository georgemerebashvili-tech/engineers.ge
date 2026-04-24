import {z} from 'zod';

/**
 * A photo value is either:
 *   - a legacy base64 data URL string (old records + transient upload body), OR
 *   - a {url, thumb_url} object pointing to Supabase Storage objects
 *
 * Nullable at array level (photo slots can be empty).
 */
export const PhotoRefSchema = z.object({
  url: z.string().min(1).max(2048),
  thumb_url: z.string().min(1).max(2048)
});

export const PhotoValueSchema = z.union([
  z.string().min(1).max(15_000_000), // data URL or any plain URL
  PhotoRefSchema
]);

export type PhotoValue = z.infer<typeof PhotoValueSchema>;
export type PhotoRef = z.infer<typeof PhotoRefSchema>;
