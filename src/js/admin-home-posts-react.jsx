const { useEffect, useMemo, useState } = React;

const PAGE_SIZE = 8;
const API_BASE_CANDIDATES = window.location.origin.includes(':5000')
  ? ['/api']
  : ['http://localhost:5000/api', '/api'];

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData;
  let lastNetworkError = null;

  for (const base of API_BASE_CANDIDATES) {
    const headers = { ...(options.headers || {}) };

    if (!isForm) {
      headers['Content-Type'] = 'application/json';
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${base}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error('Cannot connect to backend API. Start the backend server (node backend/server.js).');
  }

  throw new Error('Request failed');
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatPostedTime(value) {
  if (!value) return 'Created recently';

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Created recently';

  const diff = Date.now() - time;
  const hours = Math.max(1, Math.floor(diff / 3600000));

  if (hours < 24) {
    return `Created ${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  return `Created ${days} day${days > 1 ? 's' : ''} ago`;
}

function normalizePost(post) {
  return {
    id: post.id,
    title: post.title || 'Untitled template',
    phone: post.phone || post.contact || '+1 (555) 123-4567',
    status: post.status === 'draft' ? 'Draft' : 'Published',
    statusKey: post.status === 'draft' ? 'draft' : 'published',
    createdAt: post.created_at || null,
    viewed: Number(post.views || post.view_count || 0),
    previewImage: post.backgroundImageUrl || '/assets/logo1.png.png',
    company: post.company_name || post.company || '',
    gender: post.gender || post.gender_preference || '',
    website: post.website || post.websiteUrl || '',
  };
}

function Button({ variant = 'default', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-dashboard-500/40 disabled:pointer-events-none disabled:opacity-60';
  const variants = {
    default: 'bg-dashboard-600 text-white hover:bg-dashboard-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    destructive: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    ghost: 'text-slate-700 hover:bg-dashboard-50',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
  };

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

function Badge({ status }) {
  const isDraft = status === 'Draft';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
      )}
    >
      {status}
    </span>
  );
}

function ContextMenu({ menu, onEdit, onDelete, onClose }) {
  if (!menu) return null;

  return (
    <div
      className="fixed z-[1400] min-w-[170px] rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xl"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.post.statusKey === 'draft' ? (
        <button
          type="button"
          className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-dashboard-50"
          onClick={() => {
            onEdit(menu.post.id);
            onClose();
          }}
        >
          Edit Draft
        </button>
      ) : null}

      <button
        type="button"
        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
        onClick={() => {
          onDelete(menu.post.id);
          onClose();
        }}
      >
        Delete
      </button>
    </div>
  );
}

function FilterBar({
  status,
  search,
  sort,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onFilterToggle,
}) {
  return (
    <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[auto_170px_1fr_170px] md:items-center">
      <Button variant="secondary" size="sm" onClick={onFilterToggle}>
        Filter
      </Button>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-dashboard-500/20 focus:ring"
        aria-label="Filter by status"
      >
        <option value="all">All</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>

      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search title or contact info"
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-dashboard-500/20 placeholder:text-slate-400 focus:ring"
        aria-label="Search home posts"
      />

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-dashboard-500/20 focus:ring"
        aria-label="Sort posts"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="most-viewed">Most Viewed</option>
      </select>
    </div>
  );
}

function TemplateCard({ post, index, onEdit, onContextOpen }) {
  function handleCardClick() {
    if (post.statusKey === 'draft') {
      onEdit(post.id);
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    onContextOpen(post, e.clientX, e.clientY);
  }

  return (
    <div>
      <article
        className="group p-0 bg-transparent shadow-none transition-all duration-300 hover:-translate-y-1"
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        <div className="mx-auto mb-4 flex items-center justify-center">
          <div className="relative aspect-[8.5/11] w-[156px]">
            <div
              className="absolute inset-0 overflow-hidden flex flex-col justify-between"
              style={{
                borderRadius: 6,
                border: '1px solid rgba(148,163,184,0.4)',
                boxShadow: '0 8px 18px rgba(15,23,42,0.14)',
                background: `url(${post.previewImage}) center/cover no-repeat, #ffffff`
              }}
            >
              {/* folded corner */}
              <div className="absolute top-0 right-0 w-8 h-8 overflow-visible pointer-events-none">
                <div className="absolute top-0 right-0 h-8 w-8 border-b border-l" style={{ borderColor: 'rgba(148,163,184,0.5)', background: '#f3f4f6' }} />
              </div>

              {/* internal overlay: header area with logo + company name + draft badge */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src="/assets/logo1.png.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    {post.company ? <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(15,23,42,0.85)' }}>{post.company}</div> : null}
                  </div>
                  {post.statusKey === 'draft' ? (
                    <span style={{ background: 'rgba(255,239,213,0.95)', color: '#b45309', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>Draft</span>
                  ) : (
                    <div style={{ width: 28, height: 28 }} />
                  )}
                </div>
              </div>

              {/* hero/title area */}
              <div style={{ padding: '18px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#163723', lineHeight: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>JOB<br/>HIRING</div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(15,23,42,0.85)' }}>
                  {post.gender ? `For ${post.gender} ${post.title} Position` : `For ${post.title} Position`}
                </div>
              </div>

              {/* small footer strip to mimic poster footer with phone/website */}
              <div style={{ height: 28, background: 'rgba(0,0,0,0.85)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', fontSize: 11 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.phone}</div>
                <div style={{ opacity: 0.9 }}>{post.website ? post.website.replace(/^https?:\/\//, '') : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* title, phone, and created-time removed to keep card minimal */}

        {/* status/help text removed to keep poster area clean */}
      </article>
      <p className="mt-2 text-center text-xs font-semibold tracking-wide text-slate-500">Template #{index + 1}</p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse p-0 bg-transparent">
      <div className="mx-auto mb-4 aspect-[8.5/11] w-[156px] border border-slate-300 bg-slate-100" />
      <div className="mx-auto h-4 w-2/3 rounded bg-slate-100" />
      <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-slate-100" />
      <div className="mt-3 h-8 rounded bg-slate-100" />
      <div className="mt-2 h-8 rounded bg-slate-100" />
      <div className="mx-auto mt-2 h-3 w-1/3 rounded bg-slate-100" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h3 className="text-lg font-semibold text-slate-800">No home posts found</h3>
      <p className="mt-2 text-sm text-slate-500">
        Create or publish a hiring template to see cards appear here.
      </p>
    </div>
  );
}

function TemplateGrid({ posts, loading, onEdit, onContextOpen, startIndex }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <CardSkeleton key={`skeleton-${idx}`} />
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {posts.map((post, idx) => (
        <TemplateCard
          key={post.id}
          post={post}
          index={startIndex + idx}
          onEdit={onEdit}
          onContextOpen={onContextOpen}
        />
      ))}
    </div>
  );
}

function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        Previous
      </Button>
      {pages.map((num) => (
        <Button
          key={num}
          size="sm"
          variant={num === page ? 'default' : 'secondary'}
          onClick={() => onPageChange(num)}
          className={num === page ? 'min-w-9' : 'min-w-9'}
        >
          {num}
        </Button>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  );
}

function HomePostsApp() {
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function onEscape(e) {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    }

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      setLoading(true);
      setError('');

      try {
        const rows = await request('/admin/jobs');
        if (!mounted) return;
        setAllPosts(Array.isArray(rows) ? rows.map(normalizePost) : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load posts');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPosts();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const next = allPosts
      .filter((post) => {
        if (status !== 'all' && post.statusKey !== status) return false;

        if (!needle) return true;

        return (
          post.title.toLowerCase().includes(needle) ||
          post.phone.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        if (sort === 'most-viewed') {
          return b.viewed - a.viewed;
        }

        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();

        if (sort === 'oldest') return dateA - dateB;
        return dateB - dateA;
      });

    return next;
  }, [allPosts, status, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
    setContextMenu(null);
  }, [status, search, sort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visiblePosts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, page]);

  async function handleDelete(id) {
    setContextMenu(null);
    const ok = window.confirm('Delete this post?');
    if (!ok) return;

    try {
      await request(`/jobs/${id}`, { method: 'DELETE' });
      setAllPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (err) {
      window.alert(err.message || 'Delete failed');
    }
  }

  function handleEdit(id) {
    setContextMenu(null);
    window.location.href = `/pages/admin-jobs.html?id=${id}`;
  }

  function handleContextOpen(post, x, y) {
    const menuWidth = 180;
    const menuHeight = post.statusKey === 'draft' ? 98 : 54;
    const safeX = Math.min(x, window.innerWidth - menuWidth - 14);
    const safeY = Math.min(y, window.innerHeight - menuHeight - 14);

    setContextMenu({
      post,
      x: Math.max(12, safeX),
      y: Math.max(12, safeY),
    });
  }

  return (
    <section>
      <FilterBar
        status={status}
        search={search}
        sort={sort}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onFilterToggle={() => setPage(1)}
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <TemplateGrid
        posts={visiblePosts}
        loading={loading}
        onEdit={handleEdit}
        onContextOpen={handleContextOpen}
        startIndex={(page - 1) * PAGE_SIZE}
      />

      <ContextMenu
        menu={contextMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setContextMenu(null)}
      />

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

const rootEl = document.getElementById('home-posts-root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<HomePostsApp />);
}
