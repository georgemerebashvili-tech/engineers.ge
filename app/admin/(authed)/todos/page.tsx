import fs from 'node:fs';
import path from 'node:path';
import {AdminPageHeader, AdminSection} from '@/components/admin-page-header';
import {TodosWorkspace} from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'TODO · Admin · engineers.ge'};

export type TodoItem = {
  done: boolean;
  priority: 'blocker' | 'important' | 'nice' | 'normal';
  date: string | null;
  text: string;
  raw: string;
  section: string;
  line: number;
};

function parsePriority(text: string): TodoItem['priority'] {
  if (text.includes('🔴')) return 'blocker';
  if (text.includes('🟡')) return 'important';
  if (text.includes('🟢')) return 'nice';
  return 'normal';
}

function parseTodo(): {items: TodoItem[]; updated: string} {
  const filePath = path.resolve(process.cwd(), 'docs/TODO.md');
  let raw = '';
  let updated = '';
  try {
    const stat = fs.statSync(filePath);
    updated = stat.mtime.toISOString();
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {items: [], updated: ''};
  }

  const lines = raw.split(/\r?\n/);
  const items: TodoItem[] = [];
  let section = 'root';
  const checkbox = /^- \[( |x)\] (?:(\d{4}-\d{2}-\d{2})\s*—\s*)?(.*)$/;
  const header = /^#{1,4}\s+(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(header);
    if (h) {
      section = h[1].replace(/[🟢🟡🔴📷]/g, '').trim();
      continue;
    }
    const m = line.match(checkbox);
    if (!m) continue;
    const done = m[1] === 'x';
    const date = m[2] || null;
    const text = m[3] || '';
    items.push({
      done,
      priority: parsePriority(section + ' ' + text),
      date,
      text,
      raw: line,
      section,
      line: i + 1
    });
  }
  return {items, updated};
}

export default function TodosPage() {
  const {items, updated} = parseTodo();
  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const blockers = pending.filter((i) => i.priority === 'blocker').length;
  const important = pending.filter((i) => i.priority === 'important').length;

  return (
    <>
      <AdminPageHeader
        crumbs={[{label: 'მთავარი'}, {label: 'TODO'}]}
        title="TODO · pipeline"
        description="ცოცხალი ხედი docs/TODO.md-ის — მიმდინარე pending / blocked / done task-ები."
      />
      <AdminSection>
        <TodosWorkspace
          pending={pending}
          done={done}
          updated={updated}
          blockers={blockers}
          important={important}
        />
      </AdminSection>
    </>
  );
}
