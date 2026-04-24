'use client';

import {useEffect, useState} from 'react';

export function TbcHelpButton({onClick}: {onClick: () => void}) {
  return (
    <button
      onClick={onClick}
      title="დახმარება — სად რა არის და როგორ გამოიყენო"
      aria-label="დახმარება"
      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-yellow-500 bg-yellow-400 px-4 py-1.5 text-sm font-extrabold text-slate-900 shadow-md transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-600"
    >
      <span className="text-base">❔</span>
      <span>HELP</span>
    </button>
  );
}

type Section = {
  id: string;
  title: string;
  emoji: string;
  adminOnly?: boolean;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: 'nav',
    emoji: '🧭',
    title: 'ძირითადი ნავიგაცია',
    body: (
      <>
        <p>აპი <b>4 მთავარი ტაბისგან</b> შედგება:</p>
        <ul className="list-disc pl-5">
          <li><b>🏢 ობიექტები</b> — ფილიალების სრული ცხრილი სტატუს-ფილტრით, ძიებით, რუქით. ფილიალზე 📋 ღილაკი → დეტალი.</li>
          <li><b>📊 დეშბორდი</b> — სტატისტიკა, დონათი, რუქა, გრაფიკები ყველა ფილიალზე.</li>
          <li><b>📈 სტატისტიკა</b> — ცენტრალური სურათი: სულ ფილიალი / დანადგარი / დაგეგმილი / შესრულება %. კატეგორიების და ფილიალების ცხრილი.</li>
          <li><b>🧰 მოწყობილობები</b> — გლობალური ცნობარი: დასახელება / კოდი / განზ / ფასი. ფასი ხილულია მხოლოდ ადმინს.</li>
        </ul>
        <p>ფილიალზე შესვლისას გვერდი 3 ნაწილად: <b>ობიექტის ინფო</b> (collapsed) → <b>დანადგარების ინვენტარი</b> → <b>კონტროლერები</b> → <b>ტრეკინგი</b> → <b>ხარჯთაღრიცხვა</b> → <b>განცხადებები</b>.</p>
        <p>ზედა პანელში <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">ადმინი</span> ღილაკი → user-ების, კომპანიების, ლოგების, admin-level სტატისტიკის მართვა.</p>
      </>
    )
  },
  {
    id: 'search',
    emoji: '🔍',
    title: 'ფილიალის ძებნა და ფილტრაცია',
    body: (
      <>
        <p>ობიექტების ცხრილში ზემოთ:</p>
        <ul className="list-disc pl-5">
          <li><b>ძიება</b> — ფილიალის სახელი / ალიასი / ქალაქი / მისამართი (instant).</li>
          <li><b>რეგიონი</b> + <b>ტიპი</b> dropdown-ები.</li>
          <li>ფერადი chip-ები — სტატუსის მიხედვით (დასრულებული, მიმდინარე, დაუწყებელი...).</li>
        </ul>
        <p>ფილიალზე <b>📋 ღილაკი</b> (მწვანე, მარცხნივ) → სრული დეტალური გვერდი გამოჩნდება.</p>
      </>
    )
  },
  {
    id: 'device-add',
    emoji: '➕',
    title: 'დანადგარის დამატება და რედაქტირება',
    body: (
      <>
        <p><b>Desktop:</b> ფილიალის დეტალში „დანადგარების ინვენტარი" → <b>+ დამატება</b>. ცხრილი:</p>
        <ul className="list-disc pl-5">
          <li><b>🎛 კონტრ.</b> — კონტროლერის dropdown (ჯერ შექმენი კონტროლერი ქვემოთ)</li>
          <li>კატეგორია → ქვეტიპი → მწარმოებელი / მოდელი / S/N</li>
          <li>მდებარეობა (მაგ. „2 სართ., ოთახი 203")</li>
          <li>თარიღი (ავტო-ივსება)</li>
          <li><b>+?</b> ჩექბოქსი — „დაუგეგმავი" (გეგმაში არ იყო, მოულოდნელი)</li>
          <li>5 ფოტო სლოტი — ბირკა / ახლო / მსხვ. / გარე / დამატ.</li>
        </ul>
        <p><b>ფოტო გადიდება:</b> ფოტოზე დაკლიკე → fullscreen. mouse wheel ან ← → კლავიშებით გადახვევა ამ დანადგარის ფოტოებს შორის. <b>Escape</b> — დახურვა.</p>
        <p><b>Mobile:</b> <code>/tbc/mobile</code> → ფილიალი → ᲐᲮᲐᲚᲘ ᲛᲝᲬᲧᲝᲑᲘᲚᲝᲑᲐ → ფოტო კამერა + AI → შენახვა + შემდეგი.</p>
        <p><b>Mobile · ფილიალის არჩევა:</b> ზედა ღილაკზე დაკლიკე — გაიხსნება ძიებადი სია (alias / სახელი / ქალაქი / რეგიონი). ჩაწერე ან სიიდან აირჩიე.</p>
      </>
    )
  },
  {
    id: 'archive',
    emoji: '🗃',
    title: 'არქივი — წაშლა და აღდგენა',
    body: (
      <>
        <p>TBC-ზე <b>მონაცემები სამუდამოდ არ იშლება</b> — ყველაფერი მინიმუმ <b>360 დღე</b> ინახება არქივში.</p>
        <div className="space-y-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p><b>🗃 ღილაკი</b> ყოველ სტრიქონში → confirm dialog → ჩანაწერი გადადის არქივში. <b>360-დღიანი marker</b> ედება.</p>
          <p><b>↩ დაბრუნება</b> — არქივის პანელში ყოველ ჩანაწერს გვერდით. confirm → ბრუნდება აქტიურ სიაში.</p>
        </div>
        <p><b>Admin-ის არქივ-workspace</b> (admin panel → „🗃 არქივი" ტაბი):</p>
        <ul className="list-disc pl-5 text-[13px]">
          <li>ხედავს ყველა დაარქივებულ ჩანაწერს: მომხმარებლები / კომპანიები / ფილიალები / კომენტარები / დანადგარები / ხარჯთაღრიცხვის პოზიციები.</li>
          <li>ფილტრი + ძებნა.</li>
          <li>„↩ აღდგენა" ღილაკი ყველა ჩანაწერზე.</li>
          <li>ვადის სვეტი — `archive_expires_at` marker. auto-delete ამ ეტაპზე გამორთულია.</li>
        </ul>
      </>
    )
  },
  {
    id: 'controllers',
    emoji: '🎛',
    title: 'კონტროლერები',
    body: (
      <>
        <p>ფილიალის დეტალში „<b>🎛 კონტროლერები</b>" ბარათი — ამ ფილიალის კონტროლ პანელების/კონტროლერების სია.</p>
        <ul className="list-disc pl-5">
          <li><b>+ კონტროლერი</b> → ახალი ჩანაწერი: <b>კოდი</b> (მაგ. KTB-01) + <b>სახელი</b> + <b>განმარტება</b>.</li>
          <li>Inline edit — ყველა ველი პირდაპირ ცხრილში, auto-save.</li>
          <li><b>დანადგარი</b> სვეტი — ავტომატურად ითვლება რამდენი device ამ კონტროლერზეა მინიჭებული.</li>
          <li>🗑 ღილაკი → confirm → კონტროლერი წაიშლება + ყველა device-ს მინიჭება გაუუქმდება.</li>
        </ul>
        <p><b>მინიჭება:</b> დანადგარების ცხრილში „🎛 კონტრ." სვეტი — dropdown-ით ამოარჩიე კონტროლერი. ცვლილება auto-save.</p>
        <p>ამ გზით ადვილად დასათვლელია: „KTB-01 კონტროლერზე 12 device გვაქვს, KTB-02-ზე 8".</p>
      </>
    )
  },
  {
    id: 'products',
    emoji: '🧰',
    title: 'მოწყობილობები — გლობალური ცნობარი',
    body: (
      <>
        <p>მთავარ ტაბ ბარში <b>🧰 მოწყობილობები</b> — გლობალური პროდუქცია, რომელიც ერთად გამოიყენება ყველა ფილიალში.</p>
        <ul className="list-disc pl-5">
          <li>ცხრილი: <b>დასახელება</b> / <b>კოდი</b> / <b>განზ</b> / <b>ტეგები</b> / <b>ფასი</b>.</li>
          <li><b>+ პროდუქტი</b> — ახალი ჩანაწერი (admin-only). Inline edit, auto-save.</li>
          <li><b>⬆ XLSX იმპორტი</b> — bulk ატვირთვა. სვეტის სახელები მოქნილია: <code>დასახელება · კოდი · განზ · ტეგები · ფასი</code> (ან ინგლისურად <code>name/code/dimension/tags/price</code>). ცარიელი სახელის სტრიქონი იგნორდება.</li>
          <li><b>⬇ XLSX ექსპორტი</b> — მიმდინარე ცხრილი ფაილად. ფასი ექსპორტში ჩადის მხოლოდ ადმინისთვის.</li>
          <li><b>ძებნა</b> — სახელი / კოდი / განზ / ტეგებში (instant). ტეგზე ფოკუსისთვის: <code>#ძველი</code>.</li>
        </ul>
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
          <p><b>🏷 ტეგები — hint-ები:</b> <b>აუცილებლად იწყებოდეს <code>#</code>-ით</b> (მაგ. <code>#ვრცელი #ძველი #გარე</code>). # არ არის — ტეგი არ მიიღება. გამყოფი: სპეისი / მძიმე / Enter. ცხრილში inline chip editor — ფერად pill-ად ჩანს, × ღილაკი ფეხით შლის, empty input-ში Backspace ბოლოს აცლის. მაქს. 16 ტეგი, თითო ≤ 48 სიმბოლო. გამოიყენე როგორც შიდა hint/კლასიფიკაცია („რისი შეიძლება იყოს ეს პროდუქტი").</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p><b>🔒 ფასის ხილვადობა:</b> ფასი ჩანს <b>მხოლოდ ადმინს</b>. ჩვეულებრივ მომხმარებლებს გამოუჩნდებათ <b>***</b> — სვეტი აქვს, მაგრამ მნიშვნელობა დამალულია.</p>
        </div>
        <p><b>მიბმა დანადგარზე:</b> ფილიალის დეტალში დანადგარების ცხრილში „🎛 კონტრ." სვეტი — dropdown-ი შეიცავს როგორც ფილიალის ლოკალურ კონტროლერებს, ასევე გლობალურ მოწყობილობებს (optgroup „🧰 მოწყობილობები"). ცვლილება auto-save.</p>
      </>
    )
  },
  {
    id: 'tracking',
    emoji: '📋',
    title: 'ტრეკინგი — სასაქონლო სია',
    body: (
      <>
        <p>ფილიალის დეტალში „<b>📋 ტრეკინგი — სასაქონლო სია</b>" ბარათი — ხელით შესატანი სია:</p>
        <ul className="list-disc pl-5">
          <li><b>+ დანადგარი</b> — დაგეგმილი/საჭირო დანადგარების სია: კოდი / სახელი / რაოდ. / განზ. / შენიშვნა.</li>
          <li><b>+ სახარჯი</b> — ლარი/ფიტინგი/ფილტრი და ა.შ. — იგივე ველები.</li>
          <li>Inline edit, auto-save.</li>
          <li>🗑 სტრიქონის წაშლა.</li>
        </ul>
        <p>ეს <b>ხარჯთაღრიცხვისგან განსხვავდება</b>: tracking = „რა გვჭირდება" (planning list), estimate = „რა ჯდება" (cost sheet).</p>
      </>
    )
  },
  {
    id: 'ai',
    emoji: '🤖',
    title: 'Claude AI — ფოტოდან ავტო-შევსება',
    body: (
      <>
        <p>ცხრილის ყოველ რიგზე 2 AI ღილაკი ფოტოების შემდეგ:</p>
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p><b>🤖 AI</b> — წაიკითხავს ბირკის/ეტიკეტის ფოტოს და შეავსებს ცარიელ ველებს (კატეგ., მწარმ., მოდელი, S/N). <b>3 ცდის ლიმიტი</b> — ამოიწურება, შეავსე ხელით.</p>
          <p><b>📋 ინფო</b> — Claude მოიძიებს ინფოს, რაც ცხრილში <i>არ</i> არის: სიმძლავრე (kW/BTU), ფრეონი, SEER/COP, ზომა, ფასი. ქართულად, მოდალში.</p>
        </div>
        <p><b>კატალოგთან ავტო-დამთხვევა:</b> 🤖-ს ღილაკზე AI მწარმოებელ+მოდელის გარდა ცდილობს მონაცემთა ბაზაში დაამთხვიოს („კონტრ." სვეტი). თუ <b>დარწმუნებულია</b> — ავტომატურად ამოარჩევს. თუ <b>ვერ დაამთხვია</b> — გაიშლება მოდალი AI-ის ვარიანტებით + ღილაკით <b>„გამოტოვე ველი"</b>.</p>
        <p><b>Trick:</b> შეიყვანე brand+model ხელით, შემდეგ მხოლოდ „📋 ინფო" გაუშვი — Claude-ი ზუსტ ტექნ. სპეციფიკაციებს მოძებნის.</p>
      </>
    )
  },
  {
    id: 'production',
    emoji: '🏭',
    title: 'წარმოება — ჯამური ცხრილი',
    body: (
      <>
        <p>მთავარ ტაბ ბარში <b>🏭 წარმოება</b> — live pivot ცხრილი: ფილიალები (რიგები) × მოწყობილობები (სვეტები).</p>
        <ul className="list-disc pl-5">
          <li><b>მარცხნივ:</b> ნომერი + ფილიალის სახელი (+ alias). სტატუს-წერტილი ფილიალის სტატუსით.</li>
          <li><b>სვეტები:</b> ყველა პროდუქტი <code>🧰 მოწყობილობები</code> ცნობარიდან — დასახელებები <b>ვერტიკალურად</b>, კომპაქტურად.</li>
          <li><b>უჯრა:</b> რამდენი იმ პროდუქტის დანადგარი დევს კონკრეტულ ფილიალში (<code>product_id</code>-ით თვლა).</li>
          <li><b>ჯამი:</b> ბოლო სვეტი — ფილიალის სულ დანადგარების რაოდ. Footer — თითო პროდუქტის სულ რაოდ. + grand total.</li>
          <li><b>დინამიური:</b> ცნობარში ახალი პროდუქტი ჩაემატება → სვეტი ავტომატურად გამოდის აქ. ცნობარიდან პროდუქტი ვერ წაიშლება, თუ ის რაიმე ფილიალის ინვენტარშია — გამოვა გაფრთხილება ფილიალების ჩამონათვალით.</li>
          <li><b>ძებნა</b> — ფილიალის სახელი/alias/ქალაქი.</li>
          <li><b>ფარული ცარიელი სვეტები</b> checkbox — დამალოს ის პროდუქტები, რომლებიც არსად არ არის გამოყენებული.</li>
          <li><b>⬇ XLSX</b> — მიმდინარე ცხრილი Excel-ში.</li>
          <li>ფილიალის სახელზე click → გადადის ობიექტის დეტალურ view-ზე.</li>
        </ul>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p>⚠️ <b>ლოგიკა:</b> დანადგარი ცხრილში ითვლება მხოლოდ მაშინ, თუ დანადგარის "🎛 კონტრ." დროპდაუნში მიბმულია გლობალური <b>მოწყობილობა</b> (არა კონტროლერი და არა ცარიელი). ასე რომ ინვენტარში დანადგარებს <b>აუცილებლად</b> მიაბით პროდუქტი ცნობარიდან — წინააღმდეგ შემთხვევაში ჯამურში ვერ მოხვდება.</p>
        </div>
      </>
    )
  },
  {
    id: 'stats',
    emoji: '📈',
    title: 'სტატისტიკა ტაბი',
    body: (
      <>
        <p>მთავარ ტაბ ბარში <b>📈 სტატისტიკა</b> — ყველა ფილიალის aggregate view:</p>
        <ul className="list-disc pl-5">
          <li><b>ფილიალი</b> — სულ რამდენი.</li>
          <li><b>დანადგარი აღწერილი</b> — ყველა ფილიალიდან სულ.</li>
          <li><b>დაგეგმილი</b> — ყველა ფილიალის <code>planned_count</code>-ის ჯამი.</li>
          <li><b>შესრულება %</b> — ფაქტ. / დაგეგმ. × 100. ≥80% → მწვანე, ≥50 → ყვითელი, სხვა → წითელი.</li>
        </ul>
        <p>ქვემოთ: <b>კატეგორიების ცხრილი</b> (სახელი / რაოდ. / %) + <b>ფილიალების ცხრილი</b> (alias / დაგეგ. / ფაქტ. / %).</p>
      </>
    )
  },
  {
    id: 'estimate',
    emoji: '💰',
    title: 'ხარჯთაღრიცხვა და ინვოისი',
    body: (
      <>
        <p>ფილიალის დეტალში „ხარჯთაღრიცხვა" ბარათი:</p>
        <ul className="list-disc pl-5">
          <li><b>+ პოზიცია</b> → ცხრილი: № / დასახელება / ტიპი / განზ. / რაოდ. / ფასი / ჯამი. ავტო-save.</li>
          <li><b>🗃</b> ღილაკი სტრიქონზე → confirm → 360-დღიანი არქივი.</li>
          <li><b>🧾 ინვოისი</b> → ახალ ტაბში, ⌘P → PDF.</li>
        </ul>
        <p><span className="text-amber-600 font-semibold">მხოლოდ ადმინი</span> რედაქტირებს. User — read-only.</p>
      </>
    )
  },
  {
    id: 'export-download',
    emoji: '⬇',
    title: 'ექსპორტი — XLSX და ZIP',
    body: (
      <>
        <p>ფილიალის „დანადგარების ინვენტარი" ბარათის header-ში:</p>
        <ul className="list-disc pl-5">
          <li><b>⬇ XLSX</b> — ინვენტარის ცხრილი Excel-ში (2 sheet: ინვენტარი + ინფო). ფოტოები — file path-ების სახით. მყისიერი.</li>
          <li><b>⬇ ZIP+ფოტო</b> — სერვერი Supabase-დან ყველა ფოტოს ჩამოტვირთავს + XLSX-ს — ერთ ZIP-ად გაწყობილი:
            <code className="block mt-1 rounded bg-slate-100 px-2 py-1 text-[11px]">
              DEL2_2026-04-24.xlsx{'\n'}
              photos/device_001/birka.jpg{'\n'}
              photos/device_001/axlo.jpg{'\n'}
              ...
            </code>
          </li>
        </ul>
        <p>ZIP-ის დასამზადებლად 10–60 წამი (ფოტოების რაოდენობიდან გამომდინარე). ღილაკი „⏳ მზადდება..." მდგომარეობაში გადადის.</p>
      </>
    )
  },
  {
    id: 'global-export',
    emoji: '📥',
    title: 'ზოგადი იმპორტი / ექსპორტი',
    adminOnly: true,
    body: (
      <>
        <p>ობიექტების გვერდის ზედა ბარი:</p>
        <ul className="list-disc pl-5">
          <li><b>XLSX</b> — Excel-ით ფილიალების მასობრივი იმპორტი (merge / replace რეჟიმი). <b>მოწყობილობების სია არ შეიცვლება.</b></li>
          <li><b>⬇ ექსპორტი</b> — სრული state JSON.</li>
          <li><b>⬆ იმპორტი</b> — JSON-ის უკან ჩატვირთვა (მხოლოდ branch metadata — devices-ს ხელს არ ახება).</li>
        </ul>
        <p className="text-amber-700 font-semibold">⚠ Import ოპერაციები confirm dialog-ს მოითხოვს!</p>
      </>
    )
  },
  {
    id: 'chat',
    emoji: '💬',
    title: 'განცხადებები / ჩათი',
    body: (
      <>
        <p>„განცხადებები · ჩათი" ბარათი — გუნდის კომუნიკაცია ფილიალზე. 4 ტიპი:</p>
        <ul className="list-disc pl-5">
          <li>📝 <b>შენიშვნა</b> — ზოგადი ინფო</li>
          <li>⛔ <b>პრობლემა</b> — blocker (ამწე არ არის, ვერ მივედით)</li>
          <li>ℹ️ <b>ინფო</b> — TBC-ს ან DMT-ს განცხადება</li>
          <li>✅ <b>დასრულდა</b> — სამუშაო დამთავრდა</li>
        </ul>
        <p>🗃 ღილაკი — confirm → 360-დღიანი არქივი (permanent delete არ ხდება).</p>
        <p>საკუთარ განცხადებას ყოველთვის წაშლი; ადმინს ყველაფრის წაშლა შეუძლია.</p>
      </>
    )
  },
  {
    id: 'mobile',
    emoji: '📱',
    title: 'მობილური რეჟიმი',
    body: (
      <>
        <p>მისამართი: <code>engineers.ge/tbc/mobile</code> (ან ზედა „📱 მობ." ღილაკი).</p>
        <p>ოპტიმიზირებულია ტელეფონისთვის — დიდი ღილაკები, camera capture.</p>
        <ul className="list-disc pl-5">
          <li>ფილიალების სია მსუბუქი რეჟიმით იტვირთება (ფოტოები არა) — საიტი სწრაფად გამოდის</li>
          <li>ფილიალის არჩევის შემდეგ დანადგარები იტვირთება spinner-ით („იტვირთება დანადგარები…")</li>
          <li>სიაში მხოლოდ thumbnail-ები ჩნდება (~256px); სრული ფოტო მხოლოდ კლიკზე (double-tap → lightbox)</li>
          <li>ფოტოს ატვირთვისას slot-ზე overlay + progress % (ცუდ ინტერნეტზე ცხადი სიგნალი რომ მიდის upload)</li>
          <li>ახალი მოწყობილობა → ფოტო → AI შევსება → შენახვა + შემდეგი</li>
          <li>🗃 ბოლო დანადგარის არქივში გადატანა (confirm dialog)</li>
        </ul>
      </>
    )
  },
  {
    id: 'admin-users',
    emoji: '👥',
    title: 'მომხმარებლების მართვა',
    adminOnly: true,
    body: (
      <>
        <p><code>/tbc/admin</code> → „მომხმარებლები" ტაბი. სტატიკური ადმინები (env-შია) — ვერ წაიშლება.</p>
        <p><b>ახალი:</b> username + password + ელფოსტა + როლი (admin/user).</p>
        <ul className="list-disc pl-5">
          <li><b>📧 reset</b> — პაროლის ბმული ელფოსტაზე</li>
          <li><b>🔑 ახალი pw</b> — 4-სიმბოლოიანი random, ელფოსტაზე</li>
          <li><b>გამორთვა / ჩართვა</b> — access block</li>
          <li><b>🗃 წაშლა</b> → 360-დღიანი არქივი (პირდაპირ permanent delete არ ხდება)</li>
        </ul>
        <p>Branch access: ყოველ user-ს შეგიძლია მიანიჭო კონკრეტული ფილიალები ან „ყველა".</p>
      </>
    )
  },
  {
    id: 'admin-companies',
    emoji: '🏢',
    title: 'კომპანიების მართვა',
    adminOnly: true,
    body: (
      <>
        <p>„კომპანიები" ტაბი — კლიენტი / კონტრაქტორი / მომწოდებელი / სხვა.</p>
        <p>თითოეულზე: სახელი, ტიპი, საიდენტ. ნომერი, კონტაქტი, ტელ., ელფოსტა, მისამართი, შენიშვნები.</p>
        <p>✏️ რედაქტირების ფორმა ავტომატურად ივსება. 🗃 წაშლა → 360-დღიანი არქივი.</p>
      </>
    )
  },
  {
    id: 'admin-tables',
    emoji: '📊',
    title: 'ადმინ-ცხრილი / რეპორტი',
    adminOnly: true,
    body: (
      <>
        <p>„ცხრილი" ტაბი — aggregate ყველა ფილიალზე:</p>
        <ul className="list-disc pl-5">
          <li><b>კატეგორია</b> — დაგეგმ. vs დაყენ. + unplanned + % bar.</li>
          <li><b>ქვეტიპი</b> — დეტალური (Outdoor, კედლის ბლოკი...).</li>
          <li><b>რეგიონი</b> — რომელ რეგიონში რამდენი %, ფილიალი.</li>
        </ul>
        <p><b>⬇ ფილიალის ექსპ. (ZIP+XLSX)</b> — ტაბის ზედა ბარი: ფილიალი შეარჩიე dropdown-ით → „ZIP ჩამოტვირთვა". სერვერი ყველა ფოტოს (Supabase) + ინვენტარის XLSX-ს ჩამოიტვირთავს და ZIP-ად გამოგიგზავნის. დასრულება: 10–60 წამი.</p>
        <p className="text-xs text-slate-400">სტატისტიკა ტაბისგან განსხვავება: ეს ადმინ-panel-ის ნაწილია, სრული breakdown-ით.</p>
      </>
    )
  },
  {
    id: 'admin-logs',
    emoji: '📝',
    title: 'მოქმედებათა / შესვლის ლოგი',
    adminOnly: true,
    body: (
      <>
        <p><b>მოქმედებათა ლოგი</b> — ყოველი ცვლილება: ვინ, რა, როდის.</p>
        <ul className="list-disc pl-5">
          <li>device.add / device.archive / device.restore</li>
          <li>comment, estimate, branch.update</li>
          <li>user CRUD, password reset, login/logout</li>
        </ul>
        <p>რიგზე დაკლიკე → IP, User-Agent, სრული JSON. ფილტრი: username + action.</p>
        <p><b>შესვლის ლოგი</b> — login ცდები (წარმ. + ჩავ.).</p>
      </>
    )
  },
  {
    id: 'password',
    emoji: '🔑',
    title: 'პაროლის აღდგენა',
    body: (
      <>
        <p>შესვლის გვერდზე „პაროლი დაგავიწყდა?" → <code>/tbc/forgot</code>.</p>
        <p>შეიყვანე username ან ელფოსტა → reset ბმული ელფოსტაზე (1 სთ ვადა).</p>
        <p>ადმინი პირდაპირ admin panel-დან: „📧 reset" ან „🔑 ახალი pw" ღილაკები.</p>
      </>
    )
  },
  {
    id: 'nda',
    emoji: '🔒',
    title: 'კონფიდენციალურობა · NDA',
    body: (
      <>
        <p>პაროლები — <b>bcrypt</b> (cost 10). ორიგინალი ვერსად არ ინახება. მონაცემები — Supabase (EU region).</p>
        <p>ყველა წაშლა = <b>360-დღიანი archive</b> (permanent delete არ ხდება UI-დან). Admin audit log — ყოველი ქმედება ლოგდება.</p>
        <p>სრული NDA: <a href="/tbc/nda" target="_blank" rel="noopener" className="font-semibold text-[#0071CE] hover:underline">/tbc/nda</a></p>
      </>
    )
  }
];

export function TbcHelpModal({
  role,
  onClose
}: {
  role: 'admin' | 'user';
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('nav');

  const visibleSections = SECTIONS.filter((s) => {
    if (s.adminOnly && role !== 'admin') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 rounded-t-2xl border-b border-slate-200 bg-yellow-400 px-5 py-3">
          <span className="text-2xl">❔</span>
          <h2 className="text-lg font-extrabold text-slate-900">
            დახმარება — სად რა არის და როგორ გამოიყენო
          </h2>
          <button
            onClick={onClose}
            aria-label="დახურვა"
            className="ml-auto rounded-md bg-slate-900/10 px-3 py-1 text-sm font-bold text-slate-900 hover:bg-slate-900/20"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 თემის ძებნა…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-yellow-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
          />
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100 pb-4">
          {visibleSections.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              ამ სახელით თემა ვერ მოიძებნა
            </div>
          ) : (
            visibleSections.map((s) => {
              const open = openSection === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setOpenSection(open ? null : s.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className="flex-1 font-semibold text-slate-900">
                      {s.title}
                      {s.adminOnly && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          admin
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-slate-400 transition-transform ${
                        open ? 'rotate-90' : ''
                      }`}
                    >
                      ▸
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-2 bg-slate-50 px-5 py-4 text-[13px] leading-relaxed text-slate-700">
                      {s.body}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="sticky bottom-0 rounded-b-2xl border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
          Esc-ით ან ფანჯრის გარეთ კლიკით დახურვა · {visibleSections.length} თემა
        </footer>
      </div>
    </div>
  );
}
