import {MobileLeadPhotos} from '@/components/dmt/photo-grid';

export default async function DmtMobileLeadPhotosPage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  return <MobileLeadPhotos leadId={decodeURIComponent(id)} />;
}
