'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {ConstructionSession} from '@/lib/construction/auth';

// ── constants ──────────────────────────────────────────────────────────────
const P = '#1565C0';
const SUP_COLORS = ['#1a4fa0','#e67e22','#27ae60','#8e44ad','#c0392b','#16a085','#d35400','#2980b9'];
const VKEYS = ['bestProductTotal','selProductTotal','bestInstallTotal','selInstallTotal','selCombinedTotal','profitPct','overheadPct','discountPct','vatPct'];
const VKEY_LABELS: Record<string,string> = {
  bestProductTotal:'საუკ. პრ.',selProductTotal:'არჩ. პრ.',bestInstallTotal:'საუკ. მო.',
  selInstallTotal:'არჩ. მო.',selCombinedTotal:'კომბინ.',profitPct:'მოგ. %',
  overheadPct:'ადმინ. %',discountPct:'ფასდ. %',vatPct:'დღგ %'
};
const OPS = ['+','-','*','/','^','(',')','.','100','1000','10','1','0.1','0.01'];

// ── types ──────────────────────────────────────────────────────────────────
type Project = {
  id:string; project_no:string; name:string; notes:string|null;
  status:string; drive_url:string|null; project_date:string|null;
  winner_contact_id:string|null; formulas:Formula[];
};
type Item = {id:string; sort_order:number; name:string; unit:string; qty:number; labor_note:string|null; drive_url:string|null};
type Contact = {id:string; name:string; company:string|null; email:string|null; phone:string|null; category:string|null};
type Participant = {project_id:string; contact_id:string; sort_order:number; contact:Contact};
type Bid = {item_id:string; contact_id:string; product_price:number|null; install_price:number|null};
type Selection = {item_id:string; contact_id:string; price_type:'product'|'install'};
type Formula = {id:string; label:string; formula:string};
type QAItem = {id:string; contact_id:string; question:string; created_at:string;
  contact:{id:string;name:string;company:string|null};
  answers:{id:string;answer:string;answered_by:string;created_at:string}[];
};
type Tok = {t:'var'|'op'; v:string};

const STATUS_LABEL: Record<string,string> = {draft:'მოლოდინში',open:'ღია',closed:'დახურული',awarded:'დასრ.'};
const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', open:'bg-blue-50 text-blue-700',
  closed:'bg-amber-50 text-amber-700', awarded:'bg-green-50 text-green-700'
};

// ── helpers ────────────────────────────────────────────────────────────────
function fmt(n:number|null|undefined){
  if(n==null||isNaN(n as number)) return '—';
  return (n as number).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function sc(idx:number){return SUP_COLORS[idx%SUP_COLORS.length];}
function getBid(bids:Bid[],itemId:string,cid:string){return bids.find(b=>b.item_id===itemId&&b.contact_id===cid)??null;}
function getSel(sels:Selection[],itemId:string,type:'product'|'install'){return sels.find(s=>s.item_id===itemId&&s.price_type===type)?.contact_id??null;}
function bestCid(bids:Bid[],itemId:string,field:'product_price'|'install_price',visPart:Participant[]){
  const vis=new Set(visPart.map(p=>p.contact_id));
  let m=Infinity,c:string|null=null;
  for(const b of bids){if(b.item_id!==itemId||!vis.has(b.contact_id))continue;const v=b[field];if(v!=null&&v>0&&v<m){m=v;c=b.contact_id;}}
  return c;
}

// ── formula eval ──────────────────────────────────────────────────────────
function evalFormula(expr:string, vars:Record<string,number>){
  try{
    const fn=new Function(...Object.keys(vars),`"use strict";return(${expr});`);
    const r=fn(...Object.values(vars));
    if(!isFinite(r)||isNaN(r))throw 0;
    return {ok:true as const,val:r as number};
  }catch{return {ok:false as const};}
}

// ══════════════════════════════════════════════════════════════════════════
export function ProcurementDetail({projectId,session}:{projectId:string;session:ConstructionSession}){
  const router=useRouter();
  const isAdmin=session.role==='admin';

  // ── core state ──
  const [project,setProject]=useState<Project|null>(null);
  const [items,setItems]=useState<Item[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [bids,setBids]=useState<Bid[]>([]);
  const [sels,setSels]=useState<Selection[]>([]);
  const [allContacts,setAllContacts]=useState<Contact[]>([]);
  const [qa,setQa]=useState<QAItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadErr,setLoadErr]=useState<string|null>(null);
  const [toast,setToast]=useState<string|null>(null);

  // ── tab ──
  const [tab,setTab]=useState<'product'|'install'|'combined'|'summary'|'invoices'|'qa'|'supview'>('product');

  // ── column & supplier visibility ──
  const [colVis,setColVis]=useState({best:true,mysel:true,supsel:true,files:true});
  const [supVis,setSupVis]=useState<Record<string,boolean>>({});

  // ── summary params ──
  const [profitPct,setProfitPct]=useState(20);
  const [overheadPct,setOverheadPct]=useState(5);
  const [discountPct,setDiscountPct]=useState(0);
  const [vatPct,setVatPct]=useState(18);

  // ── project header edit ──
  const [editHdr,setEditHdr]=useState(false);
  const [hNo,setHNo]=useState('');
  const [hName,setHName]=useState('');
  const [hDate,setHDate]=useState('');
  const [hNotes,setHNotes]=useState('');
  const [hDrive,setHDrive]=useState('');
  const [hStatus,setHStatus]=useState('draft');

  // ── formula modal ──
  const [fmodal,setFmodal]=useState(false);
  const [fEditIdx,setFEditIdx]=useState<number|null>(null);
  const [fLabel,setFLabel]=useState('');
  const [fToks,setFToks]=useState<Tok[]>([]);

  // ── participants panel ──
  const [addCid,setAddCid]=useState('');

  // ── announce ──
  const [announceOpen,setAnnounceOpen]=useState(false);
  const [announceSel,setAnnounceSel]=useState<string[]>([]);
  const [announcing,setAnnouncing]=useState(false);
  const [announceRes,setAnnounceRes]=useState<{name:string;status:string}[]|null>(null);

  // ── Q&A ──
  const [qaSelId,setQaSelId]=useState<string|null>(null);
  const [qaSupSel,setQaSupSel]=useState('');
  const [qaQuestion,setQaQuestion]=useState('');
  const [qaAnswer,setQaAnswer]=useState('');
  const [qaAddOpen,setQaAddOpen]=useState(false);

  // ── Supplier View ──
  const [svSup,setSvSup]=useState('');

  // ── invoices (local) ──
  const [invs,setInvs]=useState<{id:string;name:string;type:string;amount:number;date:string;seen:boolean}[]>([]);
  const [invFilt,setInvFilt]=useState<'all'|'seen'|'unseen'>('all');

  const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({});

  function flash(msg:string){setToast(msg);setTimeout(()=>setToast(null),2500);}

  // ── load ──────────────────────────────────────────────────────────────────
  const loadAll=useCallback(async()=>{
    setLoading(true);
    setLoadErr(null);
    try{
      // fetch project first — gate everything else on it
      const pR=await fetch(`/api/construction/procurement/projects/${projectId}`);
      if(pR.status===401){router.replace('/construction');return;}
      if(!pR.ok){
        const txt=await pR.text().catch(()=>'');
        setLoadErr(`API ${pR.status}: ${txt.slice(0,120)}`);
        setLoading(false);return;
      }
      const pData=await pR.json();
      const p=pData.project;
      if(!p){setLoadErr('project null in API response');setLoading(false);return;}
      setProject(p);setHNo(p.project_no??'');setHName(p.name??'');
      setHDate(p.project_date??'');setHNotes(p.notes??'');
      setHDrive(p.drive_url??'');setHStatus(p.status??'draft');

      // now fetch the rest in parallel — failures are non-fatal
      const [iR,partR,bR,sR,cR,qaR]=await Promise.all([
        fetch(`/api/construction/procurement/projects/${projectId}/items`),
        fetch(`/api/construction/procurement/projects/${projectId}/participants`),
        fetch(`/api/construction/procurement/projects/${projectId}/bids`),
        fetch(`/api/construction/procurement/projects/${projectId}/selections`),
        fetch('/api/construction/procurement/contacts'),
        fetch(`/api/construction/procurement/projects/${projectId}/qa`),
      ]);
    if(iR.ok) setItems((await iR.json()).items??[]);
    if(partR.ok){const ps=(await partR.json()).participants??[];
      setParticipants(ps);
      setSupVis(prev=>{const n={...prev};ps.forEach((p:Participant)=>{if(!(p.contact_id in n))n[p.contact_id]=true;});return n;});
    }
      if(bR.ok) setBids((await bR.json()).bids??[]);
      if(sR.ok) setSels((await sR.json()).selections??[]);
      if(cR.ok) setAllContacts((await cR.json()).contacts??[]);
      if(qaR.ok) setQa((await qaR.json()).qa??[]);
    }catch(e){setLoadErr(String(e));}
    finally{setLoading(false);}
  },[projectId,router]);

  useEffect(()=>{loadAll();},[loadAll]);

  // ── computed vars ──────────────────────────────────────────────────────────
  const visPart=participants.filter(p=>supVis[p.contact_id]!==false);

  function getVars(){
    let bP=0,sP=0,bI=0,sI=0;
    for(const item of items){
      const bc=bestCid(bids,item.id,'product_price',visPart);
      if(bc){const b=getBid(bids,item.id,bc);if(b?.product_price)bP+=b.product_price*item.qty;}
      const sc2=getSel(sels,item.id,'product');
      if(sc2){const b=getBid(bids,item.id,sc2);if(b?.product_price)sP+=b.product_price*item.qty;}
      const bi=bestCid(bids,item.id,'install_price',visPart);
      if(bi){const b=getBid(bids,item.id,bi);if(b?.install_price)bI+=b.install_price*item.qty;}
      const si=getSel(sels,item.id,'install');
      if(si){const b=getBid(bids,item.id,si);if(b?.install_price)sI+=b.install_price*item.qty;}
    }
    return{bestProductTotal:bP,selProductTotal:sP,bestInstallTotal:bI,selInstallTotal:sI,
      selCombinedTotal:sP+sI,profitPct,overheadPct,discountPct,vatPct};
  }

  // ── save header ────────────────────────────────────────────────────────────
  async function saveHeader(){
    const res=await fetch(`/api/construction/procurement/projects/${projectId}`,{
      method:'PATCH',headers:{'content-type':'application/json'},
      body:JSON.stringify({project_no:hNo,name:hName,notes:hNotes,drive_url:hDrive,status:hStatus,project_date:hDate||null})
    });
    if(res.ok){const d=await res.json();setProject(p=>p?{...p,...d.project}:p);setEditHdr(false);flash('შენახულია ✓');}
  }

  // ── save formulas ─────────────────────────────────────────────────────────
  async function saveFormulas(fmls:Formula[]){
    setProject(p=>p?{...p,formulas:fmls}:p);
    await fetch(`/api/construction/procurement/projects/${projectId}`,{
      method:'PATCH',headers:{'content-type':'application/json'},
      body:JSON.stringify({formulas:fmls})
    });
  }

  // ── item CRUD ──────────────────────────────────────────────────────────────
  async function addItem(){
    const res=await fetch(`/api/construction/procurement/projects/${projectId}/items`,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({name:'ახალი სტრიქონი',unit:'pcs',qty:1})
    });
    if(res.ok){const d=await res.json();setItems(p=>[...p,d.item]);}
  }

  function updateItemLocal(id:string,field:string,value:string|number){
    setItems(p=>p.map(i=>i.id===id?{...i,[field]:value}:i));
    const k=`item-${id}-${field}`;
    clearTimeout(timers.current[k]);
    timers.current[k]=setTimeout(async()=>{
      await fetch(`/api/construction/procurement/projects/${projectId}/items`,{
        method:'PATCH',headers:{'content-type':'application/json'},
        body:JSON.stringify({id,project_id:projectId,[field]:value})
      });
    },700);
  }

  async function deleteItem(id:string){
    if(!confirm('სტრიქონი წაიშლება?'))return;
    await fetch(`/api/construction/procurement/projects/${projectId}/items?item_id=${id}`,{method:'DELETE'});
    setItems(p=>p.filter(i=>i.id!==id));
    setBids(p=>p.filter(b=>b.item_id!==id));
    setSels(p=>p.filter(s=>s.item_id!==id));
  }

  // ── bids ──────────────────────────────────────────────────────────────────
  function onBidChange(itemId:string,cid:string,field:'product_price'|'install_price',raw:string){
    const val=raw===''?null:parseFloat(raw)||null;
    setBids(p=>{const ex=p.find(b=>b.item_id===itemId&&b.contact_id===cid);
      if(ex)return p.map(b=>b.item_id===itemId&&b.contact_id===cid?{...b,[field]:val}:b);
      return[...p,{item_id:itemId,contact_id:cid,product_price:null,install_price:null,[field]:val}];
    });
    const k=`bid-${itemId}-${cid}-${field}`;
    clearTimeout(timers.current[k]);
    timers.current[k]=setTimeout(async()=>{
      await fetch(`/api/construction/procurement/projects/${projectId}/bids`,{
        method:'PATCH',headers:{'content-type':'application/json'},
        body:JSON.stringify({item_id:itemId,contact_id:cid,[field]:val})
      });
    },700);
  }

  // ── selections ────────────────────────────────────────────────────────────
  async function toggleSel(itemId:string,cid:string,type:'product'|'install'){
    const cur=getSel(sels,itemId,type);
    const next=cur===cid?null:cid;
    setSels(p=>[...p.filter(s=>!(s.item_id===itemId&&s.price_type===type)),...(next?[{item_id:itemId,contact_id:next,price_type:type}]:[])]);
    await fetch(`/api/construction/procurement/projects/${projectId}/selections`,{
      method:'PATCH',headers:{'content-type':'application/json'},
      body:JSON.stringify({item_id:itemId,contact_id:next,price_type:type})
    });
  }

  async function autoBest(type:'product'|'install'){
    const field=type==='product'?'product_price':'install_price';
    const newSels:Selection[]=[];
    for(const item of items){const c=bestCid(bids,item.id,field,visPart);if(c)newSels.push({item_id:item.id,contact_id:c,price_type:type});}
    setSels(p=>[...p.filter(s=>s.price_type!==type),...newSels]);
    for(const s of newSels)await fetch(`/api/construction/procurement/projects/${projectId}/selections`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({item_id:s.item_id,contact_id:s.contact_id,price_type:type})});
    flash('ავტო-შერჩევა ✓');
  }

  // ── winner ────────────────────────────────────────────────────────────────
  async function setWinner(cid:string){
    const next=project?.winner_contact_id===cid?null:cid;
    setProject(p=>p?{...p,winner_contact_id:next}:p);
    await fetch(`/api/construction/procurement/projects/${projectId}`,{
      method:'PATCH',headers:{'content-type':'application/json'},
      body:JSON.stringify({winner_contact_id:next})
    });
  }

  // ── participants ──────────────────────────────────────────────────────────
  async function addParticipant(){
    if(!addCid)return;
    const res=await fetch(`/api/construction/procurement/projects/${projectId}/participants`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contact_id:addCid})
    });
    if(res.ok){setAddCid('');const r=await fetch(`/api/construction/procurement/projects/${projectId}/participants`);
      if(r.ok){const ps=(await r.json()).participants??[];setParticipants(ps);setSupVis(prev=>{const n={...prev};ps.forEach((p:Participant)=>{if(!(p.contact_id in n))n[p.contact_id]=true;});return n;});}}
  }

  async function removeParticipant(cid:string){
    if(!confirm('ამოიღოს?'))return;
    await fetch(`/api/construction/procurement/projects/${projectId}/participants?contact_id=${cid}`,{method:'DELETE'});
    setParticipants(p=>p.filter(x=>x.contact_id!==cid));
  }

  // ── announce ──────────────────────────────────────────────────────────────
  async function sendAnnounce(){
    if(announcing||announceSel.length===0)return;
    setAnnouncing(true);
    const res=await fetch(`/api/construction/procurement/projects/${projectId}/announce`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contact_ids:announceSel})
    });
    if(res.ok){const d=await res.json();setAnnounceRes(d.results);setProject(p=>p?{...p,status:'open'}:p);}
    setAnnouncing(false);
  }

  // ── formula modal ─────────────────────────────────────────────────────────
  function openFModal(idx:number|null){
    const formulas=project?.formulas??[];
    if(idx!==null&&formulas[idx]){
      setFLabel(formulas[idx].label);
      setFToks(tokz(formulas[idx].formula));
    } else {setFLabel('ახალი ფორმ.');setFToks([]);}
    setFEditIdx(idx);setFmodal(true);
  }
  function tok2expr(tks:Tok[]){return tks.map(t=>t.v).join('');}
  function tokz(expr:string):Tok[]{
    const parts:Tok[]=[]; let last=0;
    const rx=new RegExp('('+VKEYS.join('|')+')','g'); let m;rx.lastIndex=0;
    while((m=rx.exec(expr))!==null){if(m.index>last)parts.push({t:'op',v:expr.slice(last,m.index).trim()});parts.push({t:'var',v:m[0]});last=m.index+m[0].length;}
    if(last<expr.length)parts.push({t:'op',v:expr.slice(last).trim()});
    return parts.filter(p=>p.v);
  }
  function pushTok(t:'var'|'op',v:string){setFToks(p=>[...p,{t,v}]);}
  function popTok(){setFToks(p=>p.slice(0,-1));}
  async function saveFml(){
    const formula=tok2expr(fToks); if(!formula){setFmodal(false);return;}
    const formulas=[...(project?.formulas??[])];
    const entry:Formula={id:fEditIdx!==null?(formulas[fEditIdx]?.id??crypto.randomUUID()):crypto.randomUUID(),label:fLabel||'Formula',formula};
    if(fEditIdx!==null)formulas[fEditIdx]=entry; else formulas.push(entry);
    await saveFormulas(formulas);setFmodal(false);
  }
  function deleteFml(idx:number){const formulas=[...(project?.formulas??[])];formulas.splice(idx,1);saveFormulas(formulas);}

  // ── Q&A ──────────────────────────────────────────────────────────────────
  async function submitQuestion(){
    if(!qaSupSel||!qaQuestion.trim())return;
    const res=await fetch(`/api/construction/procurement/projects/${projectId}/qa`,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({contact_id:qaSupSel,question:qaQuestion.trim()})
    });
    if(res.ok){setQaQuestion('');setQaSupSel('');setQaAddOpen(false);const r=await fetch(`/api/construction/procurement/projects/${projectId}/qa`);if(r.ok)setQa((await r.json()).qa??[]);}
  }
  async function submitAnswer(qaId:string){
    if(!qaAnswer.trim())return;
    const res=await fetch(`/api/construction/procurement/projects/${projectId}/qa/${qaId}`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({answer:qaAnswer.trim()})
    });
    if(res.ok){setQaAnswer('');const r=await fetch(`/api/construction/procurement/projects/${projectId}/qa`);if(r.ok)setQa((await r.json()).qa??[]);}
  }
  async function deleteQA(qaId:string){
    if(!confirm('წაიშლება?'))return;
    await fetch(`/api/construction/procurement/projects/${projectId}/qa/${qaId}`,{method:'DELETE'});
    setQa(p=>p.filter(q=>q.id!==qaId));if(qaSelId===qaId)setQaSelId(null);
  }

  // ── invoice (local) ───────────────────────────────────────────────────────
  function sendInvoice(mode:'best'|'selected'){
    const v=getVars();
    const amount=mode==='best'?(v.bestProductTotal+v.bestInstallTotal):v.selCombinedTotal;
    participants.filter(p=>supVis[p.contact_id]!==false).forEach(p=>{
      setInvs(prev=>[{id:crypto.randomUUID(),name:p.contact.name,type:mode,amount,date:new Date().toLocaleString('ka'),seen:false},...prev]);
    });
    setTab('invoices');flash('ინვოისი გაიგზავნა!');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── BID GRID ──────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  function BidGrid({type}:{type:'product'|'install'}){
    const field=type==='product'?'product_price':'install_price';
    return(
      <div className="flex flex-1 flex-col overflow-hidden">
        {isAdmin&&(
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
            <button onClick={addItem} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{background:P}}>+ სტრიქონი</button>
            <button onClick={()=>autoBest(type)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">⚡ ავტო-საუკ.</button>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {items.length===0?(
            <div className="py-16 text-center text-sm text-slate-400">სტრიქონი არ არის. + სტრიქონი დაამატე.</div>
          ):(
            <table className="w-full border-collapse text-[12px]" style={{minWidth:160+visPart.length*110}}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width:28}}>#</th>
                  <th className="sticky left-7 z-10 border-b border-r border-slate-100 bg-[#1a4fa0] px-3 py-2 text-left text-[10px] font-bold text-white" style={{minWidth:160}}>დასახელება</th>
                  <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-1 py-2 text-center text-[10px] font-bold text-white" style={{width:42}}>ერთ.</th>
                  <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-1 py-2 text-center text-[10px] font-bold text-white" style={{width:52}}>რაოდ.</th>
                  <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-left text-[10px] font-bold text-white" style={{minWidth:80}}>სამ.სახ.</th>
                  {colVis.files&&<th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width:48}}>📎</th>}
                  {colVis.best&&<th className="border-b border-r border-slate-100 bg-green-700 px-2 py-2 text-right text-[10px] font-bold text-white" style={{minWidth:76}}>საუკ. ფასი</th>}
                  {colVis.mysel&&<th className="border-b border-r border-slate-100 bg-amber-700 px-2 py-2 text-right text-[10px] font-bold text-white" style={{minWidth:76}}>ჩემი არჩ.</th>}
                  {colVis.supsel&&<th className="border-b border-r border-slate-100 bg-amber-700 px-2 py-2 text-center text-[10px] font-bold text-white" style={{minWidth:105}}>მომწოდ.</th>}
                  {visPart.map((p,idx)=>(
                    <th key={p.contact_id} className="border-b border-r border-slate-100 px-2 py-2 text-center text-[10px] font-bold text-white whitespace-nowrap" style={{minWidth:96,background:sc(idx)}}>
                      {project?.winner_contact_id===p.contact_id?'⭐ ':''}{p.contact.name}
                    </th>
                  ))}
                  {isAdmin&&<th className="border-b border-slate-100 bg-[#1a4fa0]" style={{width:28}}></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item,ri)=>{
                  const bc=bestCid(bids,item.id,field,visPart);
                  const selCid=getSel(sels,item.id,type);
                  const bv=bc?getBid(bids,item.id,bc)?.[field]??null:null;
                  const sv=selCid?getBid(bids,item.id,selCid)?.[field]??null:null;
                  const selPart=selCid?participants.find(p=>p.contact_id===selCid):null;
                  return(
                    <tr key={item.id} className="group border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-1 py-1.5 text-center text-[11px] text-slate-400 group-hover:bg-blue-50/30">{ri+1}</td>
                      <td className="sticky left-7 z-10 border-r border-slate-100 bg-white px-2 py-1.5 group-hover:bg-blue-50/30">
                        {isAdmin?(
                          <input className="w-full border-0 bg-transparent text-[12px] font-medium text-slate-900 focus:outline-none" value={item.name} onChange={e=>updateItemLocal(item.id,'name',e.target.value)}/>
                        ):<span className="font-medium text-slate-900">{item.name}</span>}
                      </td>
                      <td className="border-r border-slate-100 px-1 py-1.5 text-center">
                        {isAdmin?<input className="w-10 rounded border border-transparent text-center text-[11px] hover:border-slate-200 focus:border-[#1a4fa0] focus:outline-none" value={item.unit} onChange={e=>updateItemLocal(item.id,'unit',e.target.value)}/>:item.unit}
                      </td>
                      <td className="border-r border-slate-100 px-1 py-1.5 text-right">
                        {isAdmin?<input type="number" className="w-12 rounded border border-transparent text-right text-[11px] hover:border-slate-200 focus:border-[#1a4fa0] focus:outline-none" value={item.qty} onChange={e=>updateItemLocal(item.id,'qty',parseFloat(e.target.value)||1)}/>:item.qty}
                      </td>
                      <td className="border-r border-slate-100 px-2 py-1.5">
                        {isAdmin?<input className="w-full border-0 bg-transparent text-[11px] text-slate-500 focus:outline-none" value={item.labor_note??''} placeholder="სამ.სახ." onChange={e=>updateItemLocal(item.id,'labor_note',e.target.value)}/>:<span className="text-slate-400 text-[11px]">{item.labor_note??'—'}</span>}
                      </td>
                      {colVis.files&&(
                        <td className="border-r border-slate-100 px-1 py-1.5 text-center">
                          {item.drive_url?(
                            <a href={item.drive_url} target="_blank" rel="noopener noreferrer" className="text-[#1a4fa0] hover:underline text-xs">📁</a>
                          ):(isAdmin?<button onClick={()=>{const u=prompt('Drive URL:','');if(u)updateItemLocal(item.id,'drive_url',u);}} className="text-slate-200 hover:text-slate-400 text-xs">+</button>:null)}
                        </td>
                      )}
                      {colVis.best&&<td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-right font-bold text-green-700">{bv!=null?fmt(bv):'—'}</td>}
                      {colVis.mysel&&<td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-right font-bold text-amber-700">{sv!=null?fmt(sv):'—'}</td>}
                      {colVis.supsel&&<td className="border-r border-slate-100 bg-amber-50 px-1 py-1.5 text-center text-[10px] text-amber-700">{selPart?.contact.name??'—'}</td>}
                      {visPart.map((p,pidx)=>{
                        const bid=getBid(bids,item.id,p.contact_id);
                        const price=bid?bid[field]:null;
                        const isBest=p.contact_id===bc&&price!=null&&price>0;
                        const isSel=p.contact_id===selCid;
                        return(
                          <td key={p.contact_id} className={`border-r border-slate-100 px-1 py-1.5 text-right transition ${isBest?'bg-green-50':isSel?'bg-amber-50':''}`}>
                            {isAdmin?(
                              <div className="flex items-center gap-0.5 justify-end">
                                <input type="number" step="0.01" min="0"
                                  className={`w-20 rounded border px-1 py-0.5 text-right text-[11px] focus:outline-none focus:border-[#1a4fa0] ${isBest?'border-green-200 bg-green-50 font-bold text-green-700':isSel?'border-amber-200 bg-amber-50 font-semibold':'border-transparent hover:border-slate-200'}`}
                                  value={price??''} placeholder="—"
                                  onChange={e=>onBidChange(item.id,p.contact_id,field,e.target.value)}
                                />
                                <button onClick={()=>toggleSel(item.id,p.contact_id,type)}
                                  className={`ml-0.5 flex h-5 w-5 items-center justify-center rounded text-[10px] transition ${isSel?'text-amber-600':'text-slate-200 hover:text-amber-400'}`}>
                                  {isSel?'★':'☆'}
                                </button>
                              </div>
                            ):(
                              <span className={isBest?'font-bold text-green-700':isSel?'font-semibold text-amber-700':'text-slate-600'}>
                                {price!=null&&price>0?fmt(price):'—'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {isAdmin&&<td className="px-1 py-1.5 text-center"><button onClick={()=>deleteItem(item.id)} className="text-slate-200 hover:text-red-500 text-[13px]">✕</button></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1a4fa0] bg-[#eef3fb] font-bold">
                  <td colSpan={5+(colVis.files?1:0)} className="px-3 py-2 text-right text-[11px] text-slate-500">სულ</td>
                  {colVis.best&&<td className="border-r border-slate-200 px-2 py-2 text-right text-green-700">
                    {fmt(items.reduce((a,item)=>{const c=bestCid(bids,item.id,field,visPart);const b=c?getBid(bids,item.id,c):null;return a+(b?b[field]??0:0)*item.qty;},0))}
                  </td>}
                  {colVis.mysel&&<td className="border-r border-slate-200 px-2 py-2 text-right text-amber-700">
                    {fmt(items.reduce((a,item)=>{const c=getSel(sels,item.id,type);const b=c?getBid(bids,item.id,c):null;return a+(b?b[field]??0:0)*item.qty;},0))}
                  </td>}
                  {colVis.supsel&&<td className="border-r border-slate-200"></td>}
                  {visPart.map(p=>(
                    <td key={p.contact_id} className="border-r border-slate-200 px-2 py-2 text-right text-slate-700">
                      {fmt(items.reduce((a,item)=>{const b=getBid(bids,item.id,p.contact_id);return a+(b?b[field]??0:0)*item.qty;},0))}
                    </td>
                  ))}
                  {isAdmin&&<td></td>}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── LEFT SIDEBAR ──────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  function LeftSidebar(){
    const v=getVars();
    const winner=project?.winner_contact_id?participants.find(p=>p.contact_id===project.winner_contact_id):null;
    const winnerProd=winner?items.reduce((a,item)=>{const b=getBid(bids,item.id,winner.contact_id);return a+(b?.product_price??0)*item.qty;},0):0;
    const winnerInst=winner?items.reduce((a,item)=>{const b=getBid(bids,item.id,winner.contact_id);return a+(b?.install_price??0)*item.qty;},0):0;

    return(
      <div className="flex w-[230px] flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
        {/* Project info */}
        <div className="border-b border-slate-100 px-3 py-2.5">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#1a4fa0]">პროექტის ინფო</div>
          <div className="mb-2">
            <div className="mb-0.5 text-[10px] text-slate-400">თარიღი</div>
            <input type="date" className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#1a4fa0] focus:outline-none"
              value={hDate} onChange={e=>{setHDate(e.target.value);clearTimeout(timers.current['hdr-date']);timers.current['hdr-date']=setTimeout(async()=>{await fetch(`/api/construction/procurement/projects/${projectId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_date:e.target.value||null})});},800);}}/>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-slate-400">შენიშვნები</div>
            <textarea className="w-full resize-none rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:border-[#1a4fa0] focus:outline-none" rows={3}
              value={hNotes} onChange={e=>{setHNotes(e.target.value);clearTimeout(timers.current['hdr-notes']);timers.current['hdr-notes']=setTimeout(async()=>{await fetch(`/api/construction/procurement/projects/${projectId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({notes:e.target.value})});},800);}}/>
          </div>
        </div>
        {/* Drive */}
        <div className="border-b border-slate-100 px-3 py-2">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[#1a4fa0]">პროექტის ფაილები</div>
          <div className="flex items-center gap-1.5">
            <input className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] focus:border-[#1a4fa0] focus:outline-none"
              value={hDrive} placeholder="Google Drive ბმული..."
              onChange={e=>{setHDrive(e.target.value);clearTimeout(timers.current['hdr-drive']);timers.current['hdr-drive']=setTimeout(async()=>{await fetch(`/api/construction/procurement/projects/${projectId}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({drive_url:e.target.value||null})});},800);}}/>
            {hDrive&&<a href={hDrive} target="_blank" rel="noopener noreferrer" className="text-[#1a4fa0] hover:text-blue-900 text-base">📁</a>}
          </div>
        </div>
        {/* Column toggles */}
        <div className="border-b border-slate-100 px-3 py-2">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[#1a4fa0]">სვეტები</div>
          {([['best','საუკ. ფასი'],['mysel','ჩემი არჩ.'],['supsel','მომწ. სვეტი'],['files','📎 ფაილები']] as const).map(([k,lbl])=>(
            <div key={k} className="flex cursor-pointer items-center gap-1.5 py-0.5 hover:text-[#1a4fa0]" onClick={()=>setColVis(p=>({...p,[k]:!p[k as keyof typeof p]}))}>
              <div className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-sm border transition ${colVis[k as keyof typeof colVis]?'border-[#1a4fa0] bg-[#1a4fa0]':'border-slate-300'}`}>
                {colVis[k as keyof typeof colVis]&&<span className="text-white text-[8px] font-bold">✓</span>}
              </div>
              <span className="text-[11px]">{lbl}</span>
            </div>
          ))}
        </div>
        {/* Suppliers */}
        <div className="border-b border-slate-100 px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#1a4fa0]">მონაწილეები</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {participants.map((p,idx)=>(
            <div key={p.contact_id} className="flex items-center gap-1.5 border-b border-slate-50 px-2 py-1.5 hover:bg-slate-50">
              <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{background:sc(idx)}}></div>
              <input type="checkbox" className="h-3 w-3 flex-shrink-0 cursor-pointer accent-[#1a4fa0]"
                checked={supVis[p.contact_id]!==false}
                onChange={e=>setSupVis(prev=>({...prev,[p.contact_id]:e.target.checked}))}/>
              <span className={`flex-1 min-w-0 truncate text-[11px] font-semibold ${supVis[p.contact_id]===false?'text-slate-300 line-through':''}`}>{p.contact.name}</span>
              <button onClick={()=>setWinner(p.contact_id)}
                className={`flex-shrink-0 text-[13px] ${project?.winner_contact_id===p.contact_id?'text-amber-400':'text-slate-200 hover:text-amber-300'}`}>⭐</button>
            </div>
          ))}
        </div>
        {/* Winner box */}
        {winner&&(
          <div className="mx-2 my-1.5 rounded-lg p-2.5" style={{background:'linear-gradient(135deg,#f5a623,#e09010)'}}>
            <div className="text-[9px] text-amber-100 mb-0.5">🏆 გამარჯვებული</div>
            <div className="text-[12px] font-bold text-white">{winner.contact.name}</div>
            <div className="mt-1.5 flex justify-between border-t border-amber-300/40 pt-1.5">
              <div><div className="text-[9px] text-amber-100">პროდ.</div><div className="text-[11px] font-bold text-white">{fmt(winnerProd)}</div></div>
              <div><div className="text-[9px] text-amber-100">მონტ.</div><div className="text-[11px] font-bold text-white">{fmt(winnerInst)}</div></div>
              <div><div className="text-[9px] text-amber-100">სულ</div><div className="text-[11px] font-bold text-white">{fmt(winnerProd+winnerInst)}</div></div>
            </div>
          </div>
        )}
        {/* Add supplier */}
        {isAdmin&&(
          <div className="px-2 py-1.5 border-t border-slate-100">
            <div className="flex gap-1">
              <select value={addCid} onChange={e=>setAddCid(e.target.value)}
                className="flex-1 rounded border border-dashed border-slate-300 bg-transparent px-1 py-1 text-[10px] text-slate-500 focus:border-[#1a4fa0] focus:outline-none">
                <option value="">+ მომწოდ. დამატება</option>
                {allContacts.filter(c=>!participants.find(p=>p.contact_id===c.id)).map(c=>(
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {addCid&&<button onClick={addParticipant} className="rounded bg-[#1a4fa0] px-2 text-[10px] font-bold text-white">+</button>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── FORMULA MODAL ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  function FormulaModal(){
    const expr=tok2expr(fToks);
    const vars=getVars();
    const preview=expr.trim()?evalFormula(expr,vars):{ok:false as const};
    return(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={()=>setFmodal(false)}>
        <div className="flex max-h-[88vh] w-[560px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 text-white" style={{background:'#1a4fa0'}}>
            <h2 className="text-[14px] font-bold">{fEditIdx!==null?'ფორმ. რედ.':'ახალი ფორმ.'}</h2>
            <button onClick={()=>setFmodal(false)} className="text-xl leading-none">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">სახელი</div>
              <input className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] focus:border-[#1a4fa0] focus:outline-none"
                value={fLabel} onChange={e=>setFLabel(e.target.value)}/>
            </div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">ფორმულა</div>
            <div className="mb-3 min-h-[40px] cursor-text rounded-lg border border-[#c8d8f0] bg-slate-50 px-3 py-2 font-mono text-[13px] break-all">
              {fToks.map((tk,i)=>(
                <span key={i} className={tk.t==='var'?'rounded bg-blue-100 px-1 text-[#1a4fa0]':isNaN(Number(tk.v))&&tk.v!=='('&&tk.v!==')'?'font-bold text-amber-700':'text-green-700'}>
                  {tk.v}
                </span>
              ))}
              <span className="inline-block h-3.5 w-0.5 animate-pulse bg-[#1a4fa0] align-middle"></span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {VKEYS.map(k=>(
                <button key={k} onClick={()=>pushTok('var',k)}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-left transition hover:border-[#1a4fa0] hover:bg-[#1a4fa0]  group">
                  <div className="font-mono text-[10px] font-bold text-[#1a4fa0] group-hover:text-white">{k}</div>
                  <div className="text-[9px] text-slate-400 group-hover:text-blue-200">{VKEY_LABELS[k]}</div>
                </button>
              ))}
            </div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">ოპერ. & რიცხვები</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {OPS.map(op=>(
                <button key={op} onClick={()=>pushTok('op',op)}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold hover:border-[#1a4fa0] hover:bg-[#1a4fa0] hover:text-white">
                  {op}
                </button>
              ))}
              <button onClick={popTok} className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-bold text-red-500 hover:bg-red-100">⌫</button>
              <button onClick={()=>setFToks([])} className="rounded border border-slate-200 px-2.5 py-1.5 text-[12px] hover:bg-slate-100">C</button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span>შედეგი:</span>
              <span className={`text-[17px] font-bold ${preview.ok?'text-[#1a4fa0]':'text-red-500'}`}>
                {preview.ok?fmt(preview.val):'—'}
              </span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3">
            <button onClick={()=>setFToks([])} className="rounded-lg border border-slate-200 px-4 py-1.5 text-[12px]">გასუფ.</button>
            <div className="flex gap-2">
              <button onClick={()=>setFmodal(false)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-[12px]">გაუქ.</button>
              <button onClick={saveFml} className="rounded-lg px-5 py-1.5 text-[12px] font-semibold text-white" style={{background:'#1a4fa0'}}>შენახვა</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  if(loading)return(
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-sm text-slate-400">იტვირთება…</div>
    </div>
  );
  if(loadErr||!project)return(
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <div className="text-sm text-red-500 font-semibold">შეცდომა</div>
      {loadErr&&<div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-700 break-all">{loadErr}</div>}
      {!loadErr&&<div className="text-xs text-slate-400">პროექტი ვერ მოიძებნა (project null)</div>}
      <div className="flex gap-3">
        <button onClick={()=>loadAll()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100">🔄 განახლება</button>
        <Link href="/construction/procurement" className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100">← სია</Link>
        <Link href="/construction" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">🔑 შესვლა</Link>
      </div>
    </div>
  );

  const formulas=project.formulas??[];
  const v=getVars();
  const profit=v.selCombinedTotal*profitPct/100;
  const overhead=v.selCombinedTotal*overheadPct/100;
  const revenue=(v.selCombinedTotal+profit+overhead)*(1-discountPct/100);
  const finalPrice=revenue*(1+vatPct/100);

  return(
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900" style={{fontFamily:'system-ui,sans-serif'}}>
      {/* ── TOPBAR ── */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-[#1a4fa0] px-3 py-0" style={{height:44}}>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 22 12 2l10 20H2z"/><path d="M10 14h4v8h-4z"/></svg>
        </div>
        <span className="text-[13px] font-bold text-white">🏗️ შესყიდვის მოდული</span>
        <div className="mx-2 h-5 w-px bg-white/20"></div>
        {editHdr?(
          <>
            <input className="rounded border border-white/30 bg-white/10 px-2 py-0.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 w-24" value={hNo} onChange={e=>setHNo(e.target.value)} placeholder="PRJ-NO"/>
            <input className="rounded border border-white/30 bg-white/10 px-2 py-0.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 flex-1 min-w-0 max-w-xs" value={hName} onChange={e=>setHName(e.target.value)} placeholder="სახელი"/>
            <select className="rounded border border-white/30 bg-white/10 px-1 py-0.5 text-[11px] text-white focus:outline-none" value={hStatus} onChange={e=>setHStatus(e.target.value)}>
              {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k} className="text-slate-900">{v}</option>)}
            </select>
            <button onClick={saveHeader} className="rounded bg-white px-3 py-0.5 text-[11px] font-bold text-[#1a4fa0]">შენახვა</button>
            <button onClick={()=>setEditHdr(false)} className="rounded border border-white/30 px-2 py-0.5 text-[11px] text-white">გაუქ.</button>
          </>
        ):(
          <>
            {project.project_no&&<span className="font-mono text-[11px] text-white/60">{project.project_no}</span>}
            <span className="font-bold text-[13px] text-white truncate max-w-xs">{project.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${STATUS_COLOR[project.status]??STATUS_COLOR.draft}`}>{STATUS_LABEL[project.status]??project.status}</span>
            {isAdmin&&<button onClick={()=>setEditHdr(true)} className="rounded border border-white/30 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10">✏️ რედ.</button>}
          </>
        )}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <button onClick={()=>window.print()} className="rounded border border-white/30 bg-transparent px-2 py-0.5 text-[11px] text-white hover:bg-white/10">🖨 Print</button>
          <Link href="/construction/procurement" className="rounded border border-white/30 px-2 py-0.5 text-[11px] text-white hover:bg-white/10">← სია</Link>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar/>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* tabs */}
          <div className="flex flex-shrink-0 border-b border-slate-200 bg-white px-2 overflow-x-auto" style={{borderBottomWidth:2}}>
            {([
              ['product','📦 პროდ.'],['install','🔧 მონტ.'],['combined','📊 კომბინ.'],
              ['summary','📋 შეჯამ.'],['invoices','📨 ინვოის.'],['qa','💬 Q&A'],['supview','🏢 მომწ. ხედი']
            ] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors ${tab===k?'border-[#1a4fa0] text-[#1a4fa0]':'border-transparent text-slate-500 hover:text-slate-700'}`}
                style={{marginBottom:-2}}>
                {l}
              </button>
            ))}
          </div>

          {/* ── product ── */}
          {tab==='product'&&<BidGrid type="product"/>}

          {/* ── install ── */}
          {tab==='install'&&<BidGrid type="install"/>}

          {/* ── combined ── */}
          {tab==='combined'&&(
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-left text-[10px] font-bold text-white" style={{width:28}}>#</th>
                      <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-3 py-2 text-left text-[10px] font-bold text-white" style={{minWidth:160}}>დასახელება</th>
                      <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width:44}}>ერთ.</th>
                      <th className="border-b border-r border-slate-100 bg-[#1a4fa0] px-2 py-2 text-center text-[10px] font-bold text-white" style={{width:52}}>რაოდ.</th>
                      <th className="border-b border-r border-slate-100 bg-green-700 px-2 py-2 text-center text-[10px] font-bold text-white">პ. მომწ.</th>
                      <th className="border-b border-r border-slate-100 bg-green-700 px-2 py-2 text-right text-[10px] font-bold text-white">პ. ფასი</th>
                      <th className="border-b border-r border-slate-100 bg-amber-600 px-2 py-2 text-center text-[10px] font-bold text-white">მ. მომწ.</th>
                      <th className="border-b border-r border-slate-100 bg-amber-600 px-2 py-2 text-right text-[10px] font-bold text-white">მ. ფასი</th>
                      <th className="border-b border-r border-slate-100 bg-slate-700 px-2 py-2 text-right text-[10px] font-bold text-white">კომბინ.</th>
                      <th className="border-b border-slate-100 bg-slate-900 px-2 py-2 text-right text-[10px] font-bold text-white">სულ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item,idx)=>{
                      const pCid=getSel(sels,item.id,'product');
                      const iCid=getSel(sels,item.id,'install');
                      const pb=pCid?getBid(bids,item.id,pCid):null;
                      const ib=iCid?getBid(bids,item.id,iCid):null;
                      const pp=pb?.product_price??null;
                      const ip=ib?.install_price??null;
                      const comb=(pp??0)+(ip??0);
                      const pPart=pCid?participants.find(p=>p.contact_id===pCid):null;
                      const iPart=iCid?participants.find(p=>p.contact_id===iCid):null;
                      return(
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                          <td className="border-r border-slate-100 px-2 py-1.5 text-center text-slate-400">{idx+1}</td>
                          <td className="border-r border-slate-100 px-3 py-1.5 font-medium text-slate-900">{item.name}</td>
                          <td className="border-r border-slate-100 px-2 py-1.5 text-center text-slate-500">{item.unit}</td>
                          <td className="border-r border-slate-100 px-2 py-1.5 text-right font-semibold">{item.qty}</td>
                          <td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-center text-[11px] text-green-700">{pPart?.contact.name??'—'}</td>
                          <td className="border-r border-slate-100 bg-green-50 px-2 py-1.5 text-right font-bold text-green-700">{pp!=null?fmt(pp):'—'}</td>
                          <td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-center text-[11px] text-amber-700">{iPart?.contact.name??'—'}</td>
                          <td className="border-r border-slate-100 bg-amber-50 px-2 py-1.5 text-right font-bold text-amber-700">{ip!=null?fmt(ip):'—'}</td>
                          <td className="border-r border-slate-100 px-2 py-1.5 text-right font-semibold text-slate-700">{comb>0?fmt(comb):'—'}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-[#1a4fa0]">{comb>0?fmt(comb*item.qty):'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#1a4fa0] bg-blue-50 font-bold">
                      <td colSpan={9} className="px-3 py-2 text-right text-[11px] text-slate-500">სულ ჯამი</td>
                      <td className="px-2 py-2 text-right text-[14px] text-[#1a4fa0]">{fmt(v.selCombinedTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Formula chips bar */}
              <div className="flex-shrink-0 border-t-2 border-[#1a4fa0] bg-white px-4 py-2.5">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1a4fa0]">ფორმ. შედეგები</div>
                <div className="flex flex-wrap gap-2">
                  {formulas.length===0?(
                    <span className="text-[11px] text-slate-300">ფორმ. არ არის — გადადი შეჯამ. tab-ში</span>
                  ):formulas.map(f=>{
                    const r=evalFormula(f.formula,v);
                    return(
                      <div key={f.id} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 min-w-[120px]">
                        <div className="text-[10px] text-slate-500">{f.label}</div>
                        <div className="text-[14px] font-bold text-[#1a4fa0]">{r.ok?fmt(r.val):'—'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── summary ── */}
          {tab==='summary'&&(
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="flex justify-between items-center rounded-xl p-4 text-white" style={{background:'#1a4fa0'}}>
                <div><div className="text-[11px] opacity-70 mb-0.5">არჩეული კომბინ.</div><div className="text-[26px] font-bold">{fmt(v.selCombinedTotal)}</div></div>
                <div className="text-right"><div className="text-[11px] opacity-70 mb-0.5">საბოლ. ფასი (+დღგ)</div><div className="text-[22px] font-bold">{fmt(finalPrice)}</div></div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[
                  {l:'საუკ. პრ.',v2:v.bestProductTotal,c:''},
                  {l:'არჩ. პრ.',v2:v.selProductTotal,c:'bg-amber-50 border-amber-200'},
                  {l:'საუკ. მო.',v2:v.bestInstallTotal,c:''},
                  {l:'არჩ. მო.',v2:v.selInstallTotal,c:'bg-amber-50 border-amber-200'},
                  {l:'კომბინ.',v2:v.selCombinedTotal,c:'bg-blue-50 border-blue-200'},
                  {l:'მოგება',v2:profit,c:'bg-green-50 border-green-200'},
                  {l:'ადმინ.',v2:overhead,c:''},
                  {l:'შემოს.',v2:revenue,c:'bg-blue-50 border-blue-200'},
                  {l:'+დღგ',v2:finalPrice,c:'bg-blue-50 border-blue-200'},
                ].map((card,i)=>(
                  <div key={i} className={`rounded-xl border border-slate-200 bg-white p-3 ${card.c}`}>
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{card.l}</div>
                    <div className="text-[16px] font-bold text-slate-900">{fmt(card.v2)}</div>
                  </div>
                ))}
              </div>
              {/* params */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#1a4fa0]">პარამეტრები</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[['მოგება %',profitPct,setProfitPct],['ადმინ. %',overheadPct,setOverheadPct],['ფასდ. %',discountPct,setDiscountPct],['დღგ %',vatPct,setVatPct]].map(([l,val,set])=>(
                    <div key={l as string}>
                      <div className="mb-1 text-[10px] text-slate-500">{l as string}</div>
                      <input type="number" min="0" step="0.5" value={val as number}
                        onChange={e=>(set as (v:number)=>void)(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-[12px] focus:border-[#1a4fa0] focus:outline-none"/>
                    </div>
                  ))}
                </div>
              </div>
              {/* formulas */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#1a4fa0]">ფორმულები</div>
                {formulas.length===0?(
                  <p className="text-[11px] text-slate-300 py-2">ფორმ. არ არის</p>
                ):formulas.map((f,fi)=>{
                  const r=evalFormula(f.formula,v);
                  return(
                    <div key={f.id} className="mb-2 grid items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2" style={{gridTemplateColumns:'1fr 1fr auto auto auto'}}>
                      <div className="text-[12px] font-semibold truncate">{f.label}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">{f.formula}</div>
                      <div className={`text-right text-[14px] font-bold ${r.ok?'text-[#1a4fa0]':'text-red-400'}`}>{r.ok?fmt(r.val):'—'}</div>
                      <button onClick={()=>openFModal(fi)} className="rounded border border-slate-200 px-2 py-0.5 text-[10px] hover:border-[#1a4fa0]">✏️</button>
                      <button onClick={()=>deleteFml(fi)} className="rounded px-1.5 py-0.5 text-[11px] text-slate-300 hover:text-red-400">✕</button>
                    </div>
                  );
                })}
                <button onClick={()=>openFModal(null)} className="mt-2 rounded-lg border border-dashed border-slate-300 px-4 py-1.5 text-[11px] text-slate-400 hover:border-[#1a4fa0] hover:text-[#1a4fa0]">+ ფორმ. დამატება</button>
              </div>
              {/* invoice actions */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#1a4fa0]">ინვოისი</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>sendInvoice('best')} className="rounded-lg bg-green-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-green-800">📩 ინვოის (საუკ.)</button>
                  <button onClick={()=>sendInvoice('selected')} className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90" style={{background:'#1a4fa0'}}>📩 ინვოის (არჩ.)</button>
                </div>
              </div>
              {/* announce */}
              {isAdmin&&participants.length>0&&(
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#1a4fa0]">📨 ტენდერის გამოცხადება</div>
                  {!announceOpen?(
                    <button onClick={()=>{setAnnounceOpen(true);setAnnounceSel(participants.filter(p=>p.contact.email).map(p=>p.contact_id));setAnnounceRes(null);}}
                      className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-[12px] text-slate-500 hover:border-[#1a4fa0] hover:text-[#1a4fa0]">
                      ✉️ ელ-ფოსტები გაგზავნა...
                    </button>
                  ):(
                    <>
                      <div className="mb-3 space-y-1.5">
                        {participants.map((p,idx)=>(
                          <label key={p.contact_id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
                            <input type="checkbox" className="accent-[#1a4fa0]" checked={announceSel.includes(p.contact_id)}
                              onChange={e=>setAnnounceSel(prev=>e.target.checked?[...prev,p.contact_id]:prev.filter(id=>id!==p.contact_id))}/>
                            <div className="h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{background:sc(idx)}}>{p.contact.name.slice(0,2).toUpperCase()}</div>
                            <span className="flex-1 text-[12px] font-medium">{p.contact.name}</span>
                            {p.contact.email?<span className="text-[10px] text-slate-400">{p.contact.email}</span>:<span className="text-[10px] text-red-400">ელ-ფ. არ არის</span>}
                          </label>
                        ))}
                      </div>
                      {announceRes&&(
                        <div className="mb-3 rounded-lg bg-slate-50 p-2 space-y-1">
                          {announceRes.map((r,i)=>(
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <span className={r.status==='sent'?'text-green-600':r.status==='no_email'?'text-amber-600':'text-red-500'}>
                                {r.status==='sent'?'✓':r.status==='no_email'?'!':'✕'}
                              </span>
                              <span>{r.name} — {r.status==='sent'?'გაიგზავნა':r.status==='no_email'?'ელ-ფ. არ არის':'შეცდომა'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={sendAnnounce} disabled={announcing||announceSel.length===0}
                          className="flex-1 rounded-lg py-2 text-[12px] font-semibold text-white disabled:opacity-50" style={{background:'#1a4fa0'}}>
                          {announcing?'იგზ....':`📨 გაგზავნა (${announceSel.length})`}
                        </button>
                        <button onClick={()=>setAnnounceOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px]">გაუქ.</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── invoices ── */}
          {tab==='invoices'&&(
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
                <span className="text-[12px] font-semibold text-[#1a4fa0]">გაგზავნილი ინვოისები</span>
                <div className="ml-auto flex gap-1">
                  {(['all','seen','unseen'] as const).map(f=>(
                    <button key={f} onClick={()=>setInvFilt(f)}
                      className={`rounded px-2 py-1 text-[11px] font-semibold ${invFilt===f?'text-white':'text-slate-500 hover:bg-slate-100'}`}
                      style={invFilt===f?{background:'#1a4fa0'}:{}}>
                      {f==='all'?'ყველა':f==='seen'?'ნანახი':'უნახავი'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {invs.filter(i=>invFilt==='seen'?i.seen:invFilt==='unseen'?!i.seen:true).length===0?(
                  <div className="py-16 text-center text-[13px] text-slate-300">ინვოისი არ არის</div>
                ):(
                  invs.filter(i=>invFilt==='seen'?i.seen:invFilt==='unseen'?!i.seen:true).map(inv=>(
                    <div key={inv.id} onClick={()=>setInvs(p=>p.map(x=>x.id===inv.id?{...x,seen:true}:x))}
                      className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-[#1a4fa0] hover:bg-blue-50/30">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-[#1a4fa0]">{inv.name.slice(0,2).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px]">{inv.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.type==='best'?'საუკ. ფასი':'არჩეული'} · {inv.date}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inv.seen?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{inv.seen?'✓ ნანახი':'● უნახავი'}</span>
                        <span className="font-bold text-[13px] text-[#1a4fa0]">{fmt(inv.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Q&A ── */}
          {tab==='qa'&&(
            <div className="flex flex-1 overflow-hidden">
              {/* left list */}
              <div className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
                <div className="flex flex-shrink-0 items-center border-b border-slate-200 px-3 py-2">
                  <span className="text-[12px] font-semibold text-[#1a4fa0]">კითხვები</span>
                  {isAdmin&&<button onClick={()=>setQaAddOpen(p=>!p)} className="ml-auto rounded border border-[#1a4fa0] px-2 py-0.5 text-[11px] font-bold text-[#1a4fa0] hover:bg-blue-50">+ ახალი</button>}
                </div>
                {qaAddOpen&&isAdmin&&(
                  <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 space-y-1.5">
                    <select value={qaSupSel} onChange={e=>setQaSupSel(e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] focus:border-[#1a4fa0] focus:outline-none">
                      <option value="">— მომწოდ. —</option>
                      {participants.map(p=><option key={p.contact_id} value={p.contact_id}>{p.contact.name}</option>)}
                    </select>
                    <input value={qaQuestion} onChange={e=>setQaQuestion(e.target.value)} placeholder="კითხვა..."
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] focus:border-[#1a4fa0] focus:outline-none"/>
                    <div className="flex gap-1">
                      <button onClick={submitQuestion} className="flex-1 rounded py-1 text-[11px] font-semibold text-white" style={{background:'#1a4fa0'}}>გაგ.</button>
                      <button onClick={()=>setQaAddOpen(false)} className="rounded border px-2 py-1 text-[11px]">გაუქ.</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-2">
                  {qa.length===0?(
                    <div className="py-8 text-center text-[11px] text-slate-300">კითხვა არ არის</div>
                  ):qa.map(q=>{
                    const pIdx=participants.findIndex(p=>p.contact_id===q.contact_id);
                    return(
                      <div key={q.id} onClick={()=>setQaSelId(q.id)}
                        className={`mb-1.5 cursor-pointer rounded-lg border px-2.5 py-2 transition ${qaSelId===q.id?'border-[#1a4fa0] bg-blue-50':'border-slate-100 hover:border-[#1a4fa0]/40 hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold" style={{color:pIdx>=0?sc(pIdx):'#888'}}>{q.contact?.name??'?'}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${q.answers.length>0?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>
                            {q.answers.length>0?'პასუხი გაეცა':'ღია'}
                          </span>
                          {isAdmin&&<button onClick={e=>{e.stopPropagation();deleteQA(q.id);}} className="ml-auto text-[10px] text-slate-200 hover:text-red-400">✕</button>}
                        </div>
                        <div className="truncate text-[11px] text-slate-600">{q.question}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* right thread */}
              <div className="flex flex-1 flex-col bg-slate-50">
                {!qaSelId?(
                  <div className="flex flex-1 items-center justify-center text-[13px] text-slate-300">კითხვა აირჩიე</div>
                ):(()=>{
                  const q=qa.find(x=>x.id===qaSelId);
                  if(!q)return null;
                  const pIdx=participants.findIndex(p=>p.contact_id===q.contact_id);
                  return(
                    <>
                      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        <div className="max-w-[80%] rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <div className="mb-1 text-[10px] font-semibold" style={{color:pIdx>=0?sc(pIdx):'#888'}}>{q.contact?.name} · {new Date(q.created_at).toLocaleString('ka')}</div>
                          <div className="text-[13px]">{q.question}</div>
                        </div>
                        {q.answers.map(a=>(
                          <div key={a.id} className="ml-auto max-w-[80%] rounded-xl px-4 py-3 text-white" style={{background:'#1a4fa0'}}>
                            <div className="mb-1 text-[10px] text-blue-200">{a.answered_by} · {new Date(a.created_at).toLocaleString('ka')}</div>
                            <div className="text-[13px]">{a.answer}</div>
                          </div>
                        ))}
                      </div>
                      {isAdmin&&(
                        <div className="flex flex-shrink-0 gap-2 border-t border-slate-200 bg-white p-3">
                          <textarea value={qaAnswer} onChange={e=>setQaAnswer(e.target.value)} placeholder="პასუხი..."
                            className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] focus:border-[#1a4fa0] focus:outline-none" rows={3}/>
                          <button onClick={()=>submitAnswer(q.id)} className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white self-end" style={{background:'#1a4fa0'}}>↩ გაგ.</button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── supplier view ── */}
          {tab==='supview'&&(
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
                <span className="text-[12px] font-semibold text-[#1a4fa0]">მომწოდ. ხედი →</span>
                <select value={svSup} onChange={e=>setSvSup(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] focus:border-[#1a4fa0] focus:outline-none">
                  <option value="">— მომწოდ. ირჩიე —</option>
                  {participants.map(p=><option key={p.contact_id} value={p.contact_id}>{p.contact.name}</option>)}
                </select>
                <button onClick={()=>window.print()} className="ml-auto rounded border border-slate-200 px-3 py-1.5 text-[11px] hover:bg-slate-50">🖨 Print</button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 p-4">
                {!svSup?(
                  <div className="flex h-full items-center justify-center text-[13px] text-slate-300">მომწოდ. ირჩიე</div>
                ):(()=>{
                  const part=participants.find(p=>p.contact_id===svSup);
                  if(!part)return null;
                  const pIdx=participants.findIndex(p=>p.contact_id===svSup);
                  const totProd=items.reduce((a,item)=>{const b=getBid(bids,item.id,svSup);return a+(b?.product_price??0)*item.qty;},0);
                  const totInst=items.reduce((a,item)=>{const b=getBid(bids,item.id,svSup);return a+(b?.install_price??0)*item.qty;},0);
                  return(
                    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-5 py-4 text-white" style={{background:'#1a4fa0'}}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold" style={{background:sc(pIdx)+'33',color:'#fff'}}>{part.contact.name.slice(0,2).toUpperCase()}</div>
                        <div><div className="text-[15px] font-bold">შესყიდვის მოთხოვნა</div><div className="text-[12px] text-blue-200">გთხოვთ შეავსოთ თქვენი ფასები</div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3">
                        <div><div className="text-[10px] text-slate-400">პროექტი</div><div className="font-semibold text-[13px]">{project.project_no} · {project.name}</div></div>
                        <div><div className="text-[10px] text-slate-400">კომპანია</div><div className="font-semibold text-[13px] text-[#1a4fa0]">{part.contact.name}</div></div>
                        {project.drive_url&&<div><div className="text-[10px] text-slate-400">Drive</div><a href={project.drive_url} target="_blank" rel="noopener noreferrer" className="text-[#1a4fa0] text-[12px] hover:underline">📁 გახსნა</a></div>}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[12px]">
                          <thead>
                            <tr>
                              <th className="border-b-2 border-[#1a4fa0] bg-blue-50 px-3 py-2 text-left text-[10px] font-bold text-[#1a4fa0]" style={{width:28}}>#</th>
                              <th className="border-b-2 border-[#1a4fa0] bg-blue-50 px-3 py-2 text-left text-[10px] font-bold text-[#1a4fa0]">დასახელება</th>
                              <th className="border-b-2 border-[#1a4fa0] bg-blue-50 px-2 py-2 text-center text-[10px] font-bold text-[#1a4fa0]">ერთ.</th>
                              <th className="border-b-2 border-[#1a4fa0] bg-blue-50 px-2 py-2 text-center text-[10px] font-bold text-[#1a4fa0]">რაოდ.</th>
                              <th className="border-b-2 border-[#1a4fa0] bg-blue-50 px-2 py-2 text-left text-[10px] font-bold text-[#1a4fa0]">სამ.სახ.</th>
                              <th className="border-b-2 border-amber-400 bg-amber-50 px-2 py-2 text-center text-[10px] font-bold text-amber-700" style={{minWidth:110}}>თქვენი ფასი (პ.)</th>
                              <th className="border-b-2 border-amber-400 bg-amber-50 px-2 py-2 text-center text-[10px] font-bold text-amber-700" style={{minWidth:110}}>თქვენი ფასი (მ.)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item,idx)=>{
                              const bid=getBid(bids,item.id,svSup);
                              return(
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="border-r border-slate-100 px-3 py-2 text-center text-slate-400">{idx+1}</td>
                                  <td className="border-r border-slate-100 px-3 py-2 font-medium">{item.name}</td>
                                  <td className="border-r border-slate-100 px-2 py-2 text-center text-slate-500">{item.unit}</td>
                                  <td className="border-r border-slate-100 px-2 py-2 text-right font-semibold">{item.qty}</td>
                                  <td className="border-r border-slate-100 px-2 py-2 text-[11px] text-slate-400">{item.labor_note??'—'}</td>
                                  <td className="border-r border-amber-100 bg-amber-50 px-2 py-2 text-right font-bold text-green-700">{bid?.product_price?fmt(bid.product_price):<span className="text-slate-300 text-[10px]">შეიყვანეთ...</span>}</td>
                                  <td className="bg-amber-50 px-2 py-2 text-right font-bold text-green-700">{bid?.install_price?fmt(bid.install_price):<span className="text-slate-300 text-[10px]">შეიყვანეთ...</span>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                              <td colSpan={5} className="px-3 py-2 text-right text-[11px] text-[#1a4fa0]">სულ</td>
                              <td className="border-r border-amber-100 bg-amber-50 px-2 py-2 text-right font-bold text-[#1a4fa0]">{fmt(totProd)}</td>
                              <td className="bg-amber-50 px-2 py-2 text-right font-bold text-[#1a4fa0]">{fmt(totInst)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] text-slate-400">* ყვ. = შეასაყვანი</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── FORMULA MODAL ── */}
      {fmodal&&<FormulaModal/>}

      {/* ── TOAST ── */}
      {toast&&(
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg z-[300]" style={{background:'#1a4fa0'}}>
          {toast}
        </div>
      )}
    </div>
  );
}
