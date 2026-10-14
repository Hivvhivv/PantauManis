import ReactMarkdown from "react-markdown";

/**
 * Menampilkan isi materi (Markdown) dengan aman: HTML mentah tidak dirender dan tautan
 * berbahaya (mis. javascript:) dibuang oleh react-markdown. Judul diturunkan satu tingkat
 * agar h1 halaman tetap satu.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        skipHtml
        components={{
          h1: ({ children: c }) => <h2>{c}</h2>,
          h2: ({ children: c }) => <h3>{c}</h3>,
          h3: ({ children: c }) => <h4>{c}</h4>,
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {c}
            </a>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
