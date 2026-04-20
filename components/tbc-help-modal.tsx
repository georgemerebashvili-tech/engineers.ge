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
        <p>აპი 3 ძირითადი სექციისგან შედგება:</p>
        <ul className="list-disc pl-5">
          <li><b>ობიექტები</b> — ფილიალების სრული ცხრილი სტატუს-ფილტრით, ძიებით, რუქით.</li>
          <li><b>დეშბორდი</b> — სტატისტიკა, დონათი, რუქა, გრაფიკები ყველა ფილიალზე.</li>
          <li><b>ფილიალის დეტალი</b> — ცხრილში ფილიალზე დაკლიკე → გვერდი იხსნება.</li>
        </ul>
        <p>ზედა პანელში <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">ადმინი</span> ღილაკი (თუ ადმინი ხარ) → user-ების, კომპანიების, რეპორტის და ლოგების მართვა.</p>
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
          <li><b>ძიება</b> — ფილიალის/ქალაქის/აღწერის მიხედვით (instant).</li>
          <li><b>რეგიონი</b> + <b>ტიპი</b> dropdown-ები.</li>
          <li>ფერადი chip-ები — სტატუსის მიხედვით (დასრულებული, მიმდინარე, აუწერელი და ა.შ.).</li>
        </ul>
        <p>ფილიალზე რიგის ღილაკზე 🡢 → პანელი მარჯვნიდან გამოდის სწრაფი ნახვისთვის (რუქა, 최신 ინფო). „დეტალური ხედი →" ღილაკით სრული გვერდი.</p>
      </>
    )
  },
  {
    id: 'device-add',
    emoji: '➕',
    title: 'დანადგარის დამატება',
    body: (
      <>
        <p><b>Desktop:</b> ფილიალის დეტალში „დანადგარების ინვენტარი" ბარათი → <b>+ დამატე დანადგარი</b>. ცხრილი გახსნის ცარიელ რიგს:</p>
        <ul className="list-disc pl-5">
          <li>კატეგორია (dropdown) → ქვეტიპი</li>
          <li>მწარმოებელი / მოდელი / S/N</li>
          <li>ადგილმდებარეობა (მაგ. 2 სართ. ოთახი 203)</li>
          <li>თარიღი (ავტო-ივსება დღევანდელით)</li>
          <li>✓ <b>+?</b> ჩექბოქსი — „დაუგეგმავი" მოწყობილობა (გეგმაში არ იყო)</li>
          <li>5 ფოტო სლოტი — ბირკა, ახლო, მსხვილი, გარე ხედი, დამატებითი</li>
        </ul>
        <p><b>Mobile:</b> <code>/tbc/mobile</code> → ფილიალი → ᲐᲮᲐᲚᲘ ᲛᲝᲬᲧᲝᲑᲘᲚᲝᲑᲐ (დიდი ღილაკი). ფორმა, 5 დიდი ფოტო სლოტი, ⚡ შენახვა + შემდეგი.</p>
      </>
    )
  },
  {
    id: 'ai',
    emoji: '🤖',
    title: 'Claude AI — ფოტოდან ავტო-შევსება',
    body: (
      <>
        <p>ცხრილის ყოველ რიგზე 2 ღილაკი ფოტოების შემდეგ:</p>
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p><b>🤖 AI</b> — წაიკითხავს ფოტოზე ბირკას/ეტიკეტს და შეავსებს ცარიელ ველებს (კატეგორია, მწარმოებელი, მოდელი, S/N). <b>3 ცდის ლიმიტი</b> რიგზე, რომ ტოკენი არ დაიხარჯოს უშედეგოდ. როცა ცდები ამოიწურება — შეავსე ხელით.</p>
          <p><b>📋 ინფო</b> — Claude მოიძიებს იმ ინფოს, რაც ცხრილში <i>არ</i> არის: სიმძლავრე (kW/BTU), ფრეონი, ძაბვა, SEER/COP, წონა, ზომა, ფუნქციები, საბაზრო ფასი. ქართულად დაიწერება, მოდალი გამოჩნდება. <b>Trick:</b> შეგიძლია ჯერ ხელით შეიყვანო brand+model და Claude მხოლოდ რისერჩზე გაუშვა.</p>
        </div>
        <p><b>Priority:</b> AI ჯერ ცდილობს ბირკის/ეტიკეტის წაკითხვას, შემდეგ ზოგად ხედზე ეყრდნობა. კარგი ფოტო ბირკისა = კარგი შედეგი.</p>
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
          <li><b>+ პოზიცია</b> — ცხრილი: № / დასახელება / ტიპი (დანადგარი/სამუშაო/ამწე...) / განზ. (ც/სთ/მ...) / რაოდ. / ფასი / ჯამი.</li>
          <li>ყოველი ცვლილება <b>ავტოშენახვა</b> 800ms-ში.</li>
          <li>ამწის მიუდგომლობა და სხვა დამატებითი ხარჯები — დაამატე „ამწე" ტიპით.</li>
          <li><b>🧾 ინვოისი</b> ღილაკი → ახალ ტაბში გაიხსნება დაბეჭდვისთვის მზა ფორმა (⌘P → PDF-ად შენახვა).</li>
        </ul>
        <p><span className="text-amber-600">მხოლოდ ადმინი</span> რედაქტირებს ხარჯთაღრიცხვას. User-ი მხოლოდ ხედავს.</p>
      </>
    )
  },
  {
    id: 'chat',
    emoji: '💬',
    title: 'განცხადებები / ჩათი',
    body: (
      <>
        <p>„განცხადებები · ჩათი" ბარათში გუნდი ურთიერთობს ფილიალზე. 4 ტიპი:</p>
        <ul className="list-disc pl-5">
          <li>📝 <b>შენიშვნა</b> — ზოგადი ინფო</li>
          <li>⛔ <b>პრობლემა</b> — blocker (მონტაჟი ვერ მოხდა, ამწე არ არის)</li>
          <li>ℹ️ <b>ინფო</b> — TBC-ს ან DMT-ს განცხადება</li>
          <li>✅ <b>დასრულდა</b> — სამუშაო დამთავრდა</li>
        </ul>
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
        <p>მისამართი: <code>engineers.ge/tbc/mobile</code></p>
        <p>ოპტიმიზირებულია ტელეფონისთვის — დიდი ღილაკები, camera capture.</p>
        <ul className="list-disc pl-5">
          <li>ფილიალების სია (რომელიც შენს permission-ში გაქვს)</li>
          <li>ფილიალის ღილაკი → „➕ ახალი მოწყობილობა"</li>
          <li>ფოტო: 📷 → ბუნებრივად ტელეფონის კამერა</li>
          <li>AI შევსება: „🤖 AI-მ ამოიცნოს ფოტოდან" ღილაკი</li>
          <li>შენახვა + შემდეგი → loop-ად ერთ ფილიალზე დიდი რაოდენობა</li>
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
        <p><code>/tbc/admin</code> → „მომხმარებლები" ტაბი. სტატიკური 3 ადმინი (<code>admin</code>, <code>admin_givi</code>, <code>admin_temo</code>) — ინახება env-ში, ვერ წაიშლება.</p>
        <p><b>ახალი:</b> username + password + ელფოსტა + როლი (admin/user).</p>
        <p>ყოველ რიგზე:</p>
        <ul className="list-disc pl-5">
          <li><b>ელფოსტა</b> — დააყენე/შეცვალე</li>
          <li><b>📧 reset</b> — გაუგზავნის პაროლის აღდგენის ბმულს ელფოსტაზე</li>
          <li><b>პაროლი</b> — ხელით განახლება</li>
          <li><b>გამორთვა / ჩართვა</b> — block access</li>
          <li><b>წაშლა</b></li>
        </ul>
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
        <p>✏️ რედაქტირების ფორმა ავტომატურად ივსება, 💾 შენახვა.</p>
      </>
    )
  },
  {
    id: 'admin-tables',
    emoji: '📊',
    title: 'ცხრილი / რეპორტი',
    adminOnly: true,
    body: (
      <>
        <p>„ცხრილი" ტაბი — აგრეგატი ყველა ფილიალზე:</p>
        <ul className="list-disc pl-5">
          <li><b>კატეგორია</b> — რამდენი მოწყობილობაა დაგეგმილი vs დაყენებული, + unplanned, % bar.</li>
          <li><b>ქვეტიპი</b> — უფრო დეტალურად (Outdoor Unit, კედლის ბლოკი ცალ-ცალკე).</li>
          <li><b>რეგიონი</b> — რომელ რეგიონში რამდენი ფილიალია და რამდენი % დასრულდა.</li>
        </ul>
        <p>% bar-ი: ≥90 — მწვანე, ≥50 — ლურჯი, ≥25 — ყვითელი, სხვა — ვარდისფერი.</p>
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
        <p><b>მოქმედებათა ლოგი</b> — ყოველი ცვლილება: ვინ, რა, როდის, სრული შინაარსი.</p>
        <ul className="list-disc pl-5">
          <li>💬 განცხადების ტექსტი</li>
          <li>➕ დამატებული მოწყობილობის ყველა ველი</li>
          <li>💰 ხარჯთაღრიცხვის ცვლილებები (ძველი vs ახალი)</li>
          <li>👤 user-ების CRUD, პაროლის reset</li>
          <li>🔓 login / logout</li>
        </ul>
        <p>რიგზე დაკლიკე → IP, User-Agent, სრული JSON.</p>
        <p>ფილტრი: username + action-ტიპი (ლოგინი, ფილიალი, მოწყობილობა...).</p>
        <p><b>შესვლის ლოგი</b> — მხოლოდ login-ის ცდები (წარმატებული + ჩავარდნილი).</p>
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
        <p>შეიყვანე username ან ელფოსტა → თუ არსებობს ასეთი user და ელფოსტა დაყენებულია, აღდგენის ბმული გაეგზავნება (1 სთ ვადა).</p>
        <p>თუ ელფოსტა არ არის — user-მა უნდა სცადოს ადმინს მიმართოს.</p>
        <p>ადმინს შეუძლია user-ს გაუგზავნოს reset ბმული პირდაპირ admin panel-დან (📧 reset ღილაკი).</p>
      </>
    )
  },
  {
    id: 'export',
    emoji: '📥',
    title: 'იმპორტი / ექსპორტი',
    adminOnly: true,
    body: (
      <>
        <p>ობიექტების გვერდზე ზედა ღილაკები:</p>
        <ul className="list-disc pl-5">
          <li><b>XLSX</b> — Excel ფაილიდან ფილიალების მასობრივი იმპორტი (merge ან replace რეჟიმი).</li>
          <li><b>⬇ ექსპორტი</b> — მთლიანი state-ის JSON</li>
          <li><b>⬆ იმპორტი</b> — ადრე გაექსპორტირებული JSON-ის უკან ჩატვირთვა</li>
        </ul>
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
          Esc-ით ან ფანჯრის გარეთ დაკლიკვით დახურვა · {visibleSections.length} თემა
        </footer>
      </div>
    </div>
  );
}
