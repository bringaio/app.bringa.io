"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { appConfig } from "@/lib/app-config"

export default function TermsPage() {
    const [content, setContent] = useState("")
    const termsContentPath = appConfig.legal.termsContentPath

    useEffect(() => {
        fetch(termsContentPath)
            .then(res => res.text())
            .then(text => setContent(text))
            .catch(err => console.error('Failed to load terms:', err))
    }, [termsContentPath])

    return (
        <div className="min-h-screen bg-background p-4 py-12">
            <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-sm border p-8 md:p-12">
                <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mb-4
                    prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                    prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                    prose-p:leading-relaxed prose-p:mb-4
                    prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                    prose-li:my-2
                    prose-strong:font-semibold prose-strong:text-foreground
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
                ">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </article>
            </div>
        </div>
    )
}
