type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100]
}) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="mr-2.5 flex items-center h-10 justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-sm"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {currentPage > 3 && <span className="px-2">...</span>}
          {pagesAroundCurrent.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-4 py-2 rounded ${
                currentPage === page
                  ? "bg-brand-500 text-white"
                  : "text-gray-700 dark:text-gray-400"
              } flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium hover:bg-blue-500/[0.08] hover:text-brand-500 dark:hover:text-brand-500`}
            >
              {page}
            </button>
          ))}
          {currentPage < totalPages - 2 && <span className="px-2">...</span>}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-2.5 flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-700 shadow-theme-xs text-sm hover:bg-gray-50 h-10 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          Next
        </button>
      </div>
      
      {pageSize !== undefined && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Afficher</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt >= 10000 ? "Tous" : opt}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">par page</span>
        </div>
      )}
    </div>
  );
};

export default Pagination;
