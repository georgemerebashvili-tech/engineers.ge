import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getConstructionSession} from '@/lib/construction/auth';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';
import {writeConstructionAudit} from '@/lib/construction/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const Body = z.object({
  category: z.string().max(128).optional(), subtype: z.string().max(128).optional(),
  brand: z.string().max(128).optional(), model: z.string().max(128).optional(),
  serial: z.string().max(128).optional(), photos: z.array(z.string().min(32)).max(3).optional()
});

export async function POST(req: Request) {
  const session = await getConstructionSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!(await isAiEnabled())) return NextResponse.json({error:'ai_disabled'},{status:503});
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({error:'bad_request'},{status:400}); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({error:'bad_request'},{status:400});
  const key = await resolveAnthropicKey();
  if (!key) return NextResponse.json({error:'no_ai_key'},{status:503});
  const {category,subtype,brand,model,serial}=parsed.data;
  const label=[brand,model,serial].filter(Boolean).join(' ');
  if (!brand&&!model&&!(parsed.data.photos&&parsed.data.photos.length)) return NextResponse.json({error:'no_input'},{status:400});
  const modelName=await resolveAiModel();
  const systemPrompt=`You are an HVAC equipment expert who writes in Georgian (ქართული Mkhedruli). Research and return technical specs. Return JSON with fields (null if unknown, text in Georgian): serial_format, capacity_kw, capacity_btu, refrigerant, power_supply, power_consumption, seer_cop, production_year, weight_kg, dimensions, features (array), typical_price, notes. Rules: technical units in Latin, all other text Georgian, return ONLY JSON.`;
  const userText=label?`Research device: ${label}${category?` · category: ${category}`:''}${subtype?` · subtype: ${subtype}`:''}` :'Research the device in the photo.';
  const content: Array<{type:'image';source:{type:'base64';media_type:string;data:string}}|{type:'text';text:string}>=[];
  for (const p of (parsed.data.photos||[])) { const pi=parseDataUrl(p); if(pi)content.push({type:'image',source:{type:'base64',media_type:pi.mediaType,data:pi.data}}); }
  content.push({type:'text',text:userText});
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:modelName,max_tokens:900,system:systemPrompt,messages:[{role:'user',content}]})});
  if (!res.ok) return NextResponse.json({error:'ai_error',status:res.status},{status:502});
  const data=await res.json() as {content?:Array<{type:string;text?:string}>;usage?:{input_tokens?:number;output_tokens?:number}};
  const text=data.content?.find((c)=>c.type==='text')?.text?.trim()||'';
  const extracted=parseJson(text);
  if (!extracted) return NextResponse.json({error:'unparsable',raw:text.slice(0,500)},{status:502});
  await writeConstructionAudit({actor:session.username,action:'ai.research',targetType:'device',summary:`ტექნიკური ინფო: ${label||'(photo)'}`,metadata:{input:{category,subtype,brand,model,serial},result:extracted,tokens:data.usage}});
  return NextResponse.json({ok:true,result:extracted});
}
function parseDataUrl(s: string) { const m=s.match(/^data:(image\/[a-z+]+);base64,(.+)$/i); return m?{mediaType:m[1],data:m[2]}:null; }
function parseJson(text: string) { let t=text.trim(); if(t.startsWith('```'))t=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/i,''); const m=t.match(/\{[\s\S]*\}/); if(m)t=m[0]; try{return JSON.parse(t) as Record<string,unknown>;}catch{return null;} }
