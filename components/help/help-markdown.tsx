import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function HelpMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose max-w-none text-muted-foreground dark:prose-invert",
        "[&_h1]:mb-5 [&_h1]:mt-0 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground",
        "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
        "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground",
        "[&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-foreground",
        "[&_h5]:mb-2 [&_h5]:mt-5 [&_h5]:font-semibold [&_h5]:text-foreground",
        "[&_h6]:mb-2 [&_h6]:mt-5 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:text-foreground",
        "[&_p]:my-4 [&_p]:leading-7 [&_p]:text-muted-foreground",
        "[&_strong]:text-foreground [&_em]:text-foreground",
        "[&_a]:text-red-500 [&_a]:no-underline hover:[&_a]:text-red-600 hover:[&_a]:underline dark:[&_a]:text-red-400 dark:hover:[&_a]:text-red-300",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_li]:my-1 [&_li]:pl-1 [&_li::marker]:text-red-500",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-red-500/70 [&_blockquote]:bg-muted/40 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-8 [&_hr]:border-border",
        "[&_table]:my-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-border",
        "[&_thead]:border-b [&_thead]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-foreground",
        "[&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border [&_:not(pre)>code]:bg-muted/60 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-red-600 dark:[&_:not(pre)>code]:text-red-200",
        "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/60 [&_pre]:p-4",
        "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground",
        "[&_img]:my-6 [&_img]:rounded-md [&_img]:border [&_img]:border-border",
        "prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
        "prose-h1:mb-5 prose-h1:mt-0 prose-h1:text-3xl",
        "prose-h2:mb-4 prose-h2:mt-10 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:text-2xl",
        "prose-h3:mb-3 prose-h3:mt-8 prose-h3:text-xl",
        "prose-h4:mb-2 prose-h4:mt-6 prose-h4:text-lg",
        "prose-p:my-4 prose-p:leading-7 prose-p:text-muted-foreground",
        "prose-strong:text-foreground prose-em:text-foreground",
        "prose-a:text-red-500 prose-a:no-underline hover:prose-a:text-red-600 hover:prose-a:underline dark:prose-a:text-red-400 dark:hover:prose-a:text-red-300",
        "prose-ul:my-4 prose-ul:list-disc prose-ul:space-y-2 prose-ul:pl-6",
        "prose-ol:my-4 prose-ol:list-decimal prose-ol:space-y-2 prose-ol:pl-6",
        "prose-li:my-1 prose-li:pl-1 prose-li:marker:text-red-500",
        "prose-blockquote:my-6 prose-blockquote:border-l-2 prose-blockquote:border-red-500/70 prose-blockquote:bg-muted/40 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:text-muted-foreground",
        "prose-hr:my-8 prose-hr:border-border",
        "prose-table:my-6 prose-table:w-full prose-table:overflow-hidden prose-table:rounded-md prose-table:border prose-table:border-border",
        "prose-thead:border-b prose-thead:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-foreground",
        "prose-td:border-t prose-td:border-border prose-td:px-3 prose-td:py-2",
        "prose-code:rounded prose-code:border prose-code:border-border prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-red-600 prose-code:before:content-none prose-code:after:content-none dark:prose-code:text-red-200",
        "prose-pre:my-6 prose-pre:overflow-x-auto prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-pre:p-4",
        "prose-pre:code:border-0 prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-foreground",
        "prose-img:my-6 prose-img:rounded-md prose-img:border prose-img:border-border",
        "[&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:accent-red-500",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
