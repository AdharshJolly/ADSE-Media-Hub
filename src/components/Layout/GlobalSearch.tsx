'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip, Icon, ROLE_LABEL } from '@/components/ui/kit';
import { useDebounce } from '@/hooks/useDebounce';

interface Hit {
  id: string;
  title: string;
  sub: string;
  status: string;
  href: string;
  matchedIn?: string;
  snippet?: string;
}

interface Result {
  tasks: Hit[];
  tasksCount: number;
  requests: Hit[];
  requestsCount: number;
  users: Hit[];
  usersCount: number;
}

type Kind = 'tasks' | 'requests' | 'users';

const GROUPS: Array<{ kind: Kind; label: string; all: string }> = [
  { kind: 'tasks', label: 'Tasks', all: '/tasks' },
  { kind: 'requests', label: 'Requests', all: '/requests' },
  { kind: 'users', label: 'People', all: '/users' },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Mark({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${esc(term)})`, 'ig'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? <mark key={i} className="gs-mark">{p}</mark> : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

// Top-bar search: live grouped results, keyboard navigable. Enter with nothing highlighted
// falls back to the full list page for the term.
export default function GlobalSearch({ role }: { role: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = useDebounce(q.trim(), 250);
  const listId = 'gs-list';

  useEffect(() => {
    if (term.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setResult(d);
          setActive(-1);
        }
      })
      .catch(() => {
        /* aborted or offline */
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [term]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        hits: result?.[g.kind] ?? [],
        total: (result?.[`${g.kind}Count` as const] as number) ?? 0,
      })).filter((g) => g.hits.length > 0),
    [result]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  const fallback = role === 'requestor' ? '/requests' : '/tasks';
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && flat[active]) return go(flat[active].href);
    const t = q.trim();
    go(t ? `${fallback}?q=${encodeURIComponent(t)}` : fallback);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    } else if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? flat.length - 1 : a - 1));
    }
  };

  const showPanel = open && q.trim().length >= 2;
  let idx = -1;

  return (
    <form ref={wrap} className="search gs" onSubmit={submit} role="search">
      <Icon name="search" />
      <input
        ref={input}
        className="input"
        placeholder="Search tasks and requests"
        aria-label="Search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {showPanel ? (
        <div className="menu pop gs-panel" id={listId} role="listbox">
          {groups.length === 0 ? (
            <div className="gs-empty">{loading || term !== q.trim() ? 'Searching…' : `No matches for “${q.trim()}”`}</div>
          ) : (
            groups.map((g) => (
              <div key={g.kind} className="gs-group">
                <div className="gs-h">{g.label}</div>
                {g.hits.map((h) => {
                  idx += 1;
                  const i = idx;
                  return (
                    <button
                      type="button"
                      key={h.id}
                      role="option"
                      aria-selected={active === i}
                      className={`opt gs-item${active === i ? ' on' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h.href)}
                    >
                      <span className="gs-main">
                        <b className="trunc"><Mark text={h.title} term={term} /></b>
                        <span className="t-xs muted trunc"><Mark text={h.sub} term={term} /></span>
                        {h.matchedIn ? (
                          <span className="gs-why trunc">
                            <i>in {h.matchedIn}</i>
                            {h.snippet ? <> · <Mark text={h.snippet} term={term} /></> : null}
                          </span>
                        ) : null}
                      </span>
                      {g.kind === 'users' ? <span className="tag">{ROLE_LABEL[h.status] || h.status}</span> : <Chip status={h.status} />}
                    </button>
                  );
                })}
                {g.total > g.hits.length ? (
                  <button type="button" className="gs-all" onClick={() => go(`${g.all}?q=${encodeURIComponent(q.trim())}`)}>
                    See all {g.total} {g.label.toLowerCase()}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </form>
  );
}
