import {cn} from '@/lib/utils';
import type {HTMLAttributes} from 'react';

export function Container({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8', className)}
      {...props}
    />
  );
}
