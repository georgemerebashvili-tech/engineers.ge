import Link from 'next/link';

export const metadata = {
  title: 'NDA · კონფიდენციალურობა — KAYA Construction',
  robots: {index: false, follow: false}
};

const RULES: Array<{id: string; title: string; body: string}> = [
  {id: 'scope', title: 'სამუშაო ფარგლები',
    body: 'სისტემა გამოიყენება მხოლოდ KAYA Construction-ის სამშენებლო ობიექტების ინვენტარიზაცია და ტექნიკური მართვისთვის DMT-ის კონტრაქტის ფარგლებში. ნებისმიერი სხვა გამოყენება აკრძალულია.'},
  {id: 'data-access', title: 'მონაცემების წვდომა',
    body: 'წვდომა გაიცემა მხოლოდ ავტორიზებულ თანამშრომლებზე პაროლით. ადმინის მიერ გამოყოფილი ობიექტების გარდა სხვა ობიექტის მონაცემზე წვდომა შეუძლებელია. ადმინი ხედავს სრულ ლოგს — ყოველი ქმედება იწერება.'},
  {id: 'no-sharing', title: 'მონაცემების არ-გავრცელება',
    body: 'აკრძალულია ფოტოების, სერიული ნომრების, KAYA Construction-ის შიდა ინფორმაციის ან ნებისმიერი ბაზიდან ამოღებული მონაცემის გადაცემა მესამე პირებზე.'},
  {id: 'password', title: 'პაროლის უსაფრთხოება',
    body: 'პაროლი დაშიფრულია bcrypt-ით (cost 10). ორიგინალი ვერსად არ ინახება. თითოეული თანამშრომელი ვალდებულია: არ გააზიაროს პაროლი, სცადოს unique passphrase.'},
  {id: 'device-security', title: 'მოწყობილობის უსაფრთხოება',
    body: 'სისტემაში შესულ მოწყობილობას (ლეპტოპი, ტელეფონი) უნდა ჰქონდეს ეკრანის დაბლოკვა. სამუშაოს დასრულების შემდეგ — "გასვლა" აუცილებლად.'},
  {id: 'photo-rules', title: 'ფოტოების წესი',
    body: 'ფოტო უნდა მოიცავდეს მხოლოდ კონკრეტულ მოწყობილობას/ობიექტს. პერსონალური მონაცემები ფოტოდან უნდა იყოს გამორიცხული ან დაფარული.'},
  {id: 'incident', title: 'ინციდენტის შეტყობინება',
    body: 'უცნაური აქტივობის ან არაავტორიზებული წვდომის შემთხვევაში დაუყოვნებლად დაუკავშირდი DMT-ის ადმინისტრატორს. სისტემას შიდა audit log აქვს.'},
  {id: 'recovery', title: 'პაროლის აღდგენა',
    body: 'თუ პაროლი დავიწყდება: "პაროლი დაგავიწყდა" ფორმით რეგისტრირებულ ელფოსტაზე გამოიგზავნება reset ბმული (1 სთ ვადა). თუ ელფოსტა არ გაქვს — დაუკავშირდი ადმინს.'},
  {id: 'leave', title: 'დატოვება',
    body: 'სამუშაოდან წასვლის შემდეგ ანგარიში დეაქტივირდება ადმინის მიერ. ყველა ჩანაწერი (ფოტო, მოწყობილობები) რჩება KAYA Construction-ის საკუთრებაში.'},
  {id: 'contact', title: 'კონტაქტი',
    body: 'შეკითხვები: DMT ადმინი (კონტაქტი ხელშეკრულებაში). ტექნიკური ხარვეზები: engineers.ge support.'}
];

export default function ConstructionNdaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF7ED] to-[#FEF3C7] p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z" /><path d="M10 14h4v8h-4z" />
            </svg>
          </div>
          <div className="text-sm font-bold text-slate-900">KAYA Construction × DMT</div>
        </div>
        <h1 className="mb-1 text-center text-xl font-extrabold text-slate-900">
          NDA · კონფიდენციალურობის წესები
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500">
          სისტემაში მუშაობის სავალდებულო შეთანხმება
        </p>

        <div className="space-y-3">
          {RULES.map((r, i) => (
            <div key={r.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EA580C] text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h2 className="mb-1 text-sm font-bold text-slate-900">{r.title}</h2>
                <p className="text-[13px] leading-relaxed text-slate-700">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <b>🔒 ტექნიკური დაცვა</b> —{' '}
          პაროლები დაშიფრულია bcrypt-ით (10 rounds), სესიები JWT-ით (HMAC-SHA256, 30 დღე),
          ტრანსპორტი TLS 1.3-ით. ყოველი write-ოპერაცია იწერება{' '}
          <code>construction_audit_log</code>-ში IP + User-Agent-ით.
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link href="/construction" className="rounded-md bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200">
            ← შესვლა
          </Link>
          <div className="text-slate-400">ვერსია 1.0 · {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
