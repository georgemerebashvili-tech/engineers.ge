import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FanDatasheetClient } from '@/components/ahu-ashrae/fans/FanDatasheetClient';
import { FAN_MODELS, getFanByCode } from '@/lib/ahu-ashrae/fans/registry';

export function generateStaticParams() {
  return FAN_MODELS.map((m) => ({ code: m.code }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> },
): Promise<Metadata> {
  const { code } = await params;
  const m = getFanByCode(code);
  return {
    title: m
      ? `${m.code} — ვენტილატორის datasheet | engineers.ge`
      : 'Fan not found',
    description: m
      ? `${m.code} ${m.alias} ${m.spec.powerRated}W / ${m.spec.voltageRated}V — ფან მრუდი, working point, აკუსტიკა.`
      : '',
  };
}

export default async function FanDatasheetPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const model = getFanByCode(code);
  if (!model) notFound();

  return <FanDatasheetClient model={model} />;
}
