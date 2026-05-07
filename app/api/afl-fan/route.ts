import { NextRequest, NextResponse } from 'next/server';

// Public client key — hardcoded in AFL's own product.js, not a secret
const AFL_CLIENT = 'HgfsuAFLytjj65gghKi89GwvgjdHfNoI9GdVkJ5A';
const AFL_API    = 'https://api.cloudair.tech/';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const q  = req.nextUrl.searchParams.get('q');

  try {
    if (id) {
      const url = `${AFL_API}PRODUCT_get/?client_access_key=${AFL_CLIENT}&lang=en&id_product=${encodeURIComponent(id)}&full=1`;
      const res  = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return NextResponse.json({ error: 'AFL API error' }, { status: res.status });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (q !== null) {
      const url = `${AFL_API}PRODUCT_list/?client_access_key=${AFL_CLIENT}&id_product_type=70&lang=en`;
      const res  = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return NextResponse.json({ error: 'AFL API error' }, { status: res.status });
      const list = (await res.json()) as AflProductBrief[];
      const term = q.trim().toUpperCase();
      const hits = term
        ? list.filter(p => (p.name ?? '').toUpperCase().includes(term)).slice(0, 20)
        : list.slice(0, 20);
      return NextResponse.json(hits);
    }

    return NextResponse.json({ error: 'Provide ?id=… or ?q=…' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}

// Minimal shape used only by this route for filtering
interface AflProductBrief {
  id_product: number;
  name: string;
  powerRated?: number;
  voltageRated?: number;
}
