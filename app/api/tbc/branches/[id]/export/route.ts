import {NextResponse} from 'next/server';
import {canAccessTbcBranch, getTbcSession} from '@/lib/tbc/auth';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {listActiveDevices} from '@/lib/tbc/audit';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
// Allow up to 60s for large photo sets
export const maxDuration = 60;

const SLOT_NAMES = ['birka', 'axlo', 'maxelgo', 'gare', 'damat'];
const SLOT_GE    = ['ბირკა', 'ახლო ხედი', 'მახ. ხედი', 'გარე ბლოკი', 'დამატ.'];

async function fetchPhoto(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, {signal: AbortSignal.timeout(15_000)});
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const session = await getTbcSession();
  if (!session) return NextResponse.json({error: 'unauthorized'}, {status: 401});

  const {id} = await params;
  const branchId = Number(id);
  if (!Number.isFinite(branchId))
    return NextResponse.json({error: 'bad_request'}, {status: 400});

  const db = supabaseAdmin();
  if (!(await canAccessTbcBranch(db, session, branchId)))
    return NextResponse.json({error: 'forbidden'}, {status: 403});

  const res = await db
    .from('tbc_branches')
    .select('id, alias, name, region, city, address, area_m2, type, status, dmt_manager, tbc_manager, director, devices')
    .eq('id', branchId)
    .maybeSingle();

  if (!res.data) return NextResponse.json({error: 'not_found'}, {status: 404});

  const b = res.data as Record<string, unknown>;
  const devices = listActiveDevices(b.devices as unknown[]);
  const safeName = ((b.alias || b.name || 'branch') as string).replace(/[^\wა-ჿ]/g, '_');
  const date = new Date().toISOString().slice(0, 10);

  const zip = new JSZip();
  const photosFolder = zip.folder('photos')!;

  // Collect + fetch all photo jobs in parallel (batch 8)
  type PhotoJob = {url: string; folder: JSZip; name: string};
  const jobs: PhotoJob[] = [];

  devices.forEach((d, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const devFolder = photosFolder.folder(`device_${num}`)!;
    const photos = Array.isArray((d as Record<string,unknown>).photos)
      ? (d as Record<string,unknown>).photos as (string | null)[]
      : [];
    photos.forEach((url, slotIdx) => {
      if (url) jobs.push({url, folder: devFolder, name: `${SLOT_NAMES[slotIdx] ?? slotIdx}.jpg`});
    });
    const sitPhotos = (d as Record<string,unknown>).situational_photos;
    if (Array.isArray(sitPhotos)) {
      sitPhotos.forEach((sp: Record<string,unknown>, si: number) => {
        if (sp?.src) jobs.push({url: sp.src as string, folder: devFolder, name: `sit_${si + 1}.jpg`});
      });
    }
  });

  const BATCH = 8;
  let fetched = 0;
  for (let i = 0; i < jobs.length; i += BATCH) {
    await Promise.all(
      jobs.slice(i, i + BATCH).map(async ({url, folder, name}) => {
        const buf = await fetchPhoto(url);
        if (buf) { folder.file(name, buf); fetched++; }
      })
    );
  }

  // Build XLSX
  const rows = devices.map((d, idx) => {
    const raw = d as Record<string, unknown>;
    const num = String(idx + 1).padStart(3, '0');
    const photos = Array.isArray(raw.photos) ? raw.photos as (string | null)[] : [];
    const row: Record<string, unknown> = {
      '№': idx + 1,
      'კატეგორია': raw.category || '',
      'ქვეტიპი': raw.subtype || '',
      'მწარმოებელი': raw.brand || '',
      'მოდელი': raw.model || '',
      'S/N': raw.serial || '',
      'მდებარეობა': raw.location || '',
      'მონტაჟის თარიღი': raw.install_date || '',
      'დაუგეგმავი': raw.unplanned ? 'კი' : '',
      'სპეციფიკაცია': raw.specs || '',
    };
    SLOT_GE.forEach((lbl, i) => {
      row[lbl] = photos[i] ? `photos/device_${num}/${SLOT_NAMES[i]}.jpg` : '';
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:4},{wch:14},{wch:18},{wch:14},{wch:16},{wch:20},
    {wch:24},{wch:14},{wch:6},{wch:20},
    {wch:30},{wch:30},{wch:30},{wch:30},{wch:30}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ინვენტარი');

  const infoRows = [
    {ველი:'ფილიალი',     მნიშვნელობა: b.name||''},
    {ველი:'ალიასი',      მნიშვნელობა: b.alias||''},
    {ველი:'რეგიონი',     მნიშვნელობა: b.region||''},
    {ველი:'ქალაქი',      მნიშვნელობა: b.city||''},
    {ველი:'მისამართი',   მნიშვნელობა: b.address||''},
    {ველი:'ფართობი მ²',  მნიშვნელობა: b.area_m2||''},
    {ველი:'სტატუსი',     მნიშვნელობა: b.status||''},
    {ველი:'DMT მენეჯერი',მნიშვნელობა: b.dmt_manager||''},
    {ველი:'TBC მენეჯერი',მნიშვნელობა: b.tbc_manager||''},
    {ველი:'სულ დანადგარი',მნიშვნელობა: devices.length},
    {ველი:'ფოტო ჩამოტვირთული',მნიშვნელობა: fetched},
    {ველი:'ექსპ. თარიღი', მნიშვნელობა: date},
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo['!cols'] = [{wch:22},{wch:40}];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'ინფო');

  const xlsxBuf = XLSX.write(wb, {type: 'buffer', bookType: 'xlsx'}) as Buffer;
  zip.file(`${safeName}_${date}.xlsx`, xlsxBuf);

  const zipBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {level: 6}
  });

  return new NextResponse(new Uint8Array(zipBuf), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="tbc_${safeName}_${date}.zip"`,
      'Content-Length': String(zipBuf.length),
    }
  });
}
