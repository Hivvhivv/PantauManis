import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const sp = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => !!e[1]),
    );
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <nav className="pagination" aria-label="Halaman">
      {page > 1 && (
        <Link className="btn btn-sm" href={href(page - 1)}>
          Sebelumnya
        </Link>
      )}
      <span className="small muted">
        Halaman {page} dari {pageCount}
      </span>
      {page < pageCount && (
        <Link className="btn btn-sm" href={href(page + 1)}>
          Berikutnya
        </Link>
      )}
    </nav>
  );
}
