import Link from 'next/link';

export const metadata = {
  title: 'NDA · კონფიდენციალურობა — TBC ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

const RULES: Array<{id: string; title: string; body: string}> = [
  {
    id: 'scope',
    title: 'სამუშაო ფარგლები',
    body: 'სისტემა გამოიყენება მხოლოდ TBC ფილიალების ინვენტარიზაცია და ტექნიკური მართვისთვის DMT-ის კონტრაქტის ფარგლებში. ნებისმიერი სხვა გამოყენება აკრძალულია.'
  },
  {
    id: 'data-access',
    title: 'მონაცემების წვდომა',
    body: 'წვდომა გაიცემა მხოლოდ ავტორიზებულ თანამშრომლებზე პაროლით. ადმინის მიერ გამოყოფილი ფილიალების გარდა სხვა ფილიალის მონაცემზე წვდომა შეუძლებელია. ადმინი ხედავს სრულ ლოგს — ყოველი ქმედება იწერება.'
  },
  {
    id: 'no-sharing',
    title: 'მონაცემების არ-გავრცელება',
    body: 'აკრძალულია ფოტოების, სერიული ნომრების, TBC-ს შიდა ინფორმაციის ან ნებისმიერი ბაზიდან ამოღებული მონაცემის გადაცემა მესამე პირებზე (messenger, social media, private cloud, email attachment გარდა ოფიციალური არხებისა).'
  },
  {
    id: 'password',
    title: 'პაროლის უსაფრთხოება',
    body: 'პაროლი დაშიფრულია bcrypt-ით (cost 10). ორიგინალი ვერსად არ ინახება. თითოეული თანამშრომელი ვალდებულია: არ გააზიაროს პაროლი, არ ჩაწეროს ქაღალდზე ან public ადგილას, სცადოს unique passphrase.'
  },
  {
    id: 'device-security',
    title: 'მოწყობილობის უსაფრთხოება',
    body: 'სისტემაში შესულ მოწყობილობას (ლეპტოპი, ტელეფონი) უნდა ჰქონდეს ეკრანის დაბლოკვა. public Wi-Fi-ს გამოყენება ავტორიზაციის დროს არ არის რეკომენდებული. სამუშაოს დასრულების შემდეგ — "გასვლა" აუცილებლად.'
  },
  {
    id: 'photo-rules',
    title: 'ფოტოების წესი',
    body: 'ფოტო უნდა მოიცავდეს მხოლოდ კონკრეტულ მოწყობილობას/ობიექტს. კლიენტების პერსონალური მონაცემები (მომხმარებლის სახე, პერსონალური დოკუმენტები) ფოტოდან უნდა იყოს გამორიცხული ან დაფარული.'
  },
  {
    id: 'incident',
    title: 'ინციდენტის შეტყობინება',
    body: 'უცნაური აქტივობის, არაავტორიზებული წვდომის ან მონაცემების დაკარგვის შემთხვევაში დაუყოვნებლად დაუკავშირდი DMT-ის ადმინისტრატორს. სისტემას შიდა audit log აქვს — ადმინი დაინახავს ყოველ მოქმედებას.'
  },
  {
    id: 'recovery',
    title: 'პაროლის აღდგენა',
    body: 'თუ პაროლი დავიწყდება: საჯარო "პაროლი დაგავიწყდა" ფორმით რეგისტრირებულ ელფოსტაზე გამოიგზავნება reset ბმული (1 სთ ვადა). თუ ელფოსტა არ გაქვს მიბმული — დაუკავშირდი ადმინს. bcrypt hash-ის მათემატიკური შებრუნება შეუძლებელია.'
  },
  {
    id: 'leave',
    title: 'დატოვება',
    body: 'სამუშაოდან წასვლის შემდეგ ანგარიში დეაქტივირდება ადმინის მიერ. ყველა ჩანაწერი (ფოტო, განცხადებები, მოწყობილობები) რჩება TBC-ის საკუთრებაში.'
  },
  {
    id: 'contact',
    title: 'კონტაქტი',
    body: 'შეკითხვები: DMT ადმინი (კონტაქტი ხელშეკრულებაში). ტექნიკური ხარვეზები: engineers.ge@support. TBC-ის წარმომადგენელი: ხელშეკრულების საკონტაქტო პირი.'
  }
];

export default function NdaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F2FB] to-[#E0F7F3] p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex items-center justify-center gap-4">
          <img src="/tbc/logos/tbc.svg" alt="TBC" className="h-8 w-auto" />
          <span className="text-xl text-slate-300">×</span>
          <img src="/tbc/logos/dmt.png" alt="DMT" className="h-7 w-auto" />
        </div>
        <h1 className="mb-1 text-center text-xl font-extrabold text-slate-900">
          NDA · კონფიდენციალურობის წესები
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500">
          სისტემაში მუშაობის სავალდებულო შეთანხმება
        </p>

        <div className="space-y-3">
          {RULES.map((r, i) => (
            <div
              key={r.id}
              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0071CE] text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h2 className="mb-1 text-sm font-bold text-slate-900">
                  {r.title}
                </h2>
                <p className="text-[13px] leading-relaxed text-slate-700">
                  {r.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <b>🔒 ტექნიკური დაცვა</b> —{' '}
          პაროლები დაშიფრულია bcrypt-ით (10 rounds), სესიები JWT-ით (HMAC-SHA256, 30 დღე),
          ტრანსპორტი TLS 1.3-ით. ყოველი write-ოპერაცია იწერება{' '}
          <code>tbc_audit_log</code>-ში IP + User-Agent-ით.
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/tbc"
            className="rounded-md bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
          >
            ← შესვლა
          </Link>
          <div className="text-slate-400">
            ვერსია 1.0 · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
