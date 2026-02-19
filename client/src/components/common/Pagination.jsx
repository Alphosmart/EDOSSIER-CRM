export default function Pagination({ page, pages, total, limit = 20, onPageChange }) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build page numbers array (show up to 7 pages at a time)
  const getPageNumbers = () => {
    const range = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) range.push(i);
    } else if (page <= 4) {
      for (let i = 1; i <= 5; i++) range.push(i);
      range.push('...');
      range.push(pages);
    } else if (page >= pages - 3) {
      range.push(1);
      range.push('...');
      for (let i = pages - 4; i <= pages; i++) range.push(i);
    } else {
      range.push(1);
      range.push('...');
      for (let i = page - 1; i <= page + 1; i++) range.push(i);
      range.push('...');
      range.push(pages);
    }
    return range;
  };

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-sm text-gray-500 hidden sm:block">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>

        {getPageNumbers().map((num, idx) =>
          num === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`w-9 h-9 text-sm rounded border ${
                num === page
                  ? 'bg-primary-600 text-white border-primary-600 font-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {num}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
