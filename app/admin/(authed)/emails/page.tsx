import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {EMAIL_TEMPLATES, type EmailTemplateKey} from '@/lib/email-templates';
import {EmailsPreview} from './preview';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Email preview · Admin · engineers.ge'};

type Search = {template?: string};

export default async function AdminEmailsPage({
  searchParams
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const initialKey =
    (sp.template && sp.template in EMAIL_TEMPLATES
      ? (sp.template as EmailTemplateKey)
      : 'welcome');

  const items = (Object.entries(EMAIL_TEMPLATES) as Array<
    [EmailTemplateKey, typeof EMAIL_TEMPLATES[EmailTemplateKey]]
  >).map(([key, def]) => {
    const {subject, html} = def.render();
    return {key, label: def.label, description: def.description, subject, html};
  });

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'პარამეტრები'}, {label: 'Email preview'}]}
        title="Email template preview"
        description='რასაც user-ს ვუგზავნით — ქვემოთ შეგიძლია ნახო. „Send test" ღილაკი გააგზავნის ADMIN_EMAIL-ზე ნამდვილ წერილს.'
      />
      <AdminSection>
        <EmailsPreview templates={items} initialKey={initialKey} />
      </AdminSection>
    </>
  );
}
