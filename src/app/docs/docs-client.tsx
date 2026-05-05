"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useState } from "react";

import { AppImage } from "@/components/ui/app-image";
import { appConfig } from "@/lib/app-config";
import {
  buildDocsPageHref,
  resolveDocsSelection,
  rewriteDocsMarkdownHref,
} from "@/lib/docs-view";
import type { DocsManifestEntry } from "@/lib/docs-view";

type DocsManifest = {
  docs: DocsManifestEntry[];
};

type LoadedDocument = {
  slug: string;
  content: string;
};

type DocumentError = {
  slug: string;
  message: string;
};

const docsManifestPath = `${appConfig.content.docsPublicPath}/index.json`;

export default function DocsClient() {
  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get("doc") || "index";
  const [manifest, setManifest] = useState<DocsManifest | null>(null);
  const [loadedDocument, setLoadedDocument] = useState<LoadedDocument | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentError | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch(docsManifestPath)
      .then((response) => {
        if (!response.ok) throw new Error("Docs manifest could not be loaded.");
        return response.json() as Promise<DocsManifest>;
      })
      .then((nextManifest) => {
        if (mounted) setManifest(nextManifest);
      })
      .catch((err: unknown) => {
        if (mounted) setManifestError(err instanceof Error ? err.message : "Docs could not be loaded.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedDoc = useMemo(
    () => resolveDocsSelection({ docs: manifest?.docs ?? [], requestedSlug }),
    [manifest, requestedSlug],
  );

  useEffect(() => {
    if (!selectedDoc) return;
    let mounted = true;
    const slug = selectedDoc.slug;

    fetch(selectedDoc.path)
      .then((response) => {
        if (!response.ok) throw new Error("Document could not be loaded.");
        return response.text();
      })
      .then((content) => {
        if (mounted) setLoadedDocument({ slug, content });
      })
      .catch((err: unknown) => {
        if (mounted) {
          setDocumentError({ slug, message: err instanceof Error ? err.message : "Document could not be loaded." });
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedDoc]);

  const selectedDocumentError = selectedDoc && documentError?.slug === selectedDoc.slug ? documentError.message : null;
  const selectedMarkdown = selectedDoc && loadedDocument?.slug === selectedDoc.slug ? loadedDocument.content : "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href={appConfig.app.homeHref} className="flex items-center gap-2">
            <AppImage src={appConfig.branding.logoPath} alt="" width={24} height={24} className="h-6 w-6 rounded-sm" />
            <span className="font-semibold">{appConfig.branding.logoText}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              App
            </Link>
            <a href={appConfig.repository.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <div className="mb-3 text-xs font-medium uppercase text-muted-foreground">Docs</div>
          <nav
            className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border p-2 md:max-h-[calc(100vh-3rem)] md:border-0 md:p-0"
            aria-label="Documentation"
          >
            {(manifest?.docs ?? []).map((doc) => (
              <Link
                key={doc.slug}
                href={buildDocsPageHref(doc.slug)}
                aria-current={selectedDoc?.slug === doc.slug ? "page" : undefined}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          {manifestError || selectedDocumentError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {manifestError || selectedDocumentError}
            </div>
          ) : selectedMarkdown ? (
            <ReactMarkdown
              components={{
                a: ({ href, children, ...props }) => {
                  const nextHref = rewriteDocsMarkdownHref(href);
                  const external = Boolean(nextHref && /^[a-z][a-z0-9+.-]*:/i.test(nextHref));
                  return (
                    <a
                      href={nextHref}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                code: ({ children, ...props }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props}>
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm" {...props}>
                    {children}
                  </pre>
                ),
                h1: ({ children, ...props }) => (
                  <h1 className="mb-4 text-3xl font-semibold tracking-normal" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="mb-3 mt-8 text-xl font-semibold tracking-normal" {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="mb-2 mt-6 text-base font-semibold" {...props}>
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p className="my-3 leading-7 text-foreground" {...props}>
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul className="my-3 list-disc space-y-2 pl-6 leading-7" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="my-3 list-decimal space-y-2 pl-6 leading-7" {...props}>
                    {children}
                  </ol>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote className="my-4 border-l-2 pl-4 text-muted-foreground" {...props}>
                    {children}
                  </blockquote>
                ),
                table: ({ children, ...props }) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="border-b px-3 py-2 text-left font-medium" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td className="border-b px-3 py-2 align-top" {...props}>
                    {children}
                  </td>
                ),
              }}
            >
              {selectedMarkdown}
            </ReactMarkdown>
          ) : (
            <div className="text-sm text-muted-foreground">Loading document...</div>
          )}
        </article>
      </div>
    </main>
  );
}
