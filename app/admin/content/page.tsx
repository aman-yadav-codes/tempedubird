"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { ArrowUpDown } from "lucide-react"

type Post = {
  id: number
  title: string
  status: string
  date: string
  author: string
}

const posts: Post[] = [
  { id: 1, title: "Getting Started with Next.js", status: "Published", date: "May 1, 2026", author: "Alice" },
  { id: 2, title: "Understanding Tailwind CSS", status: "Draft", date: "May 3, 2026", author: "Bob" },
  { id: 3, title: "Shadcn UI Deep Dive", status: "Published", date: "May 4, 2026", author: "Charlie" },
  { id: 4, title: "Server Components Explained", status: "Review", date: "May 5, 2026", author: "Alice" },
  { id: 5, title: "Deploying on Vercel", status: "Draft", date: "May 5, 2026", author: "Bob" },
];

const statusColor: Record<string, string> = {
  Published: "bg-green-100 text-green-700",
  Draft: "bg-zinc-100 text-zinc-600",
  Review: "bg-amber-100 text-amber-700",
};

const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center hover:bg-muted/50 px-2 py-1 -ml-2 rounded-md transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </button>
      )
    },
  },
  {
    accessorKey: "author",
    header: "Author",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[status]}`}>
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: "date",
    header: "Date",
  },
]

export default function ContentPage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground">Manage your articles and posts.</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
          + New Post
        </button>
      </div>

      <DataTable columns={columns} data={posts} searchKey="title" />
    </div>
  );
}
