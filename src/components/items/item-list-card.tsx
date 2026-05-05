"use client"

import Link from "next/link"
import { Package } from "lucide-react"

import type { ItemDb } from "@/app/model/model"
import { AppImage } from "@/components/ui/app-image"
import { cn } from "@/lib/utils"

type ItemListCardItem = Pick<ItemDb, "id" | "name" | "description" | "image_url" | "status">

type ItemListCardProps = {
  item: ItemListCardItem
  href?: string
  className?: string
}

function itemStatusLabel(status: ItemListCardItem["status"]) {
  return status === "borrowed" ? "Borrowed" : "In Stock"
}

function itemStatusClasses(status: ItemListCardItem["status"]) {
  return status === "borrowed"
    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
    : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
}

export function ItemStatusBadge({
  status,
  className,
}: {
  status: ItemListCardItem["status"]
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium",
        itemStatusClasses(status),
        className,
      )}
    >
      {itemStatusLabel(status)}
    </span>
  )
}

export function ItemListCard({ item, href, className }: ItemListCardProps) {
  const itemHref = href ?? `/items/details?id=${encodeURIComponent(item.id)}`

  return (
    <Link
      href={itemHref}
      className={cn(
        "block w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <article className="flex w-full items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        {item.image_url ? (
          <AppImage
            src={item.image_url}
            alt={item.name}
            width={56}
            height={56}
            sizes="56px"
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 break-words text-sm font-medium leading-snug">
                {item.name}
              </h2>
              <p className="mt-1 line-clamp-2 break-words text-sm leading-normal text-muted-foreground">
                {item.description || "No description"}
              </p>
            </div>
            <ItemStatusBadge status={item.status} className="w-fit" />
          </div>
        </div>
      </article>
    </Link>
  )
}
