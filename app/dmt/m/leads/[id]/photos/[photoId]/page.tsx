import {LeadPhotoDetail} from '@/components/dmt/photo-grid';

export default async function DmtMobileLeadPhotoDetailPage({
  params
}: {
  params: Promise<{id: string; photoId: string}>;
}) {
  const {id, photoId} = await params;
  return <LeadPhotoDetail leadId={decodeURIComponent(id)} photoId={decodeURIComponent(photoId)} />;
}
