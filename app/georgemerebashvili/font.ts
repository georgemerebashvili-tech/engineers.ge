import {Noto_Sans_Georgian} from 'next/font/google';

/**
 * The design asks for 'Noto Sans Georgian', which most machines do not have installed. Loaded here (not in
 * the root layout) so only /georgemerebashvili pays for it; portfolio.module.css reads the variable.
 */
export const notoSansGeorgian = Noto_Sans_Georgian({
  variable: '--font-noto-georgian',
  subsets: ['georgian', 'latin'],
  display: 'swap'
});
