"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { marked } from "marked";

export default function DevJourney() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dev-journey")
      .then((res) => res.text())
      .then((text) => {
        const html = marked(text) as string;
        setContent(html);
        setLoading(false);
      })
      .catch(() => {
        setContent("<p>Failed to load development journey</p>");
        setLoading(false);
      });
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <Link href="/" style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}>
        ← Back to Dashboard
      </Link>

      {loading ? (
        <p style={{ marginTop: 24 }}>Loading...</p>
      ) : (
        <article
          className="markdown-content"
          style={{
            marginTop: 24,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{
            __html: content,
          }}
        />
      )}

      <style jsx global>{`
        .markdown-content h1 {
          margin-top: 32px;
          margin-bottom: 16px;
        }
        .markdown-content h2 {
          margin-top: 32px;
          margin-bottom: 12px;
        }
        .markdown-content h3 {
          margin-top: 24px;
          margin-bottom: 8px;
        }
        .markdown-content h4 {
          margin-top: 20px;
          margin-bottom: 8px;
        }
        .markdown-content p {
          margin: 12px 0;
        }
        .markdown-content ul {
          margin: 16px 0;
          padding-left: 24px;
        }
        .markdown-content li {
          margin: 4px 0;
        }
        .markdown-content pre {
          background: #f4f4f4;
          padding: 16px;
          border-radius: 4px;
          overflow-x: auto;
        }
        .markdown-content code {
          color: #000000;
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .markdown-content pre code {
          background: transparent;
          padding: 0;
        }
        .markdown-content blockquote {
          border-left: 3px solid #ddd;
          padding-left: 16px;
          margin: 16px 0;
          color: #666;
        }
        .markdown-content hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 32px 0;
        }
        .markdown-content strong {
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
