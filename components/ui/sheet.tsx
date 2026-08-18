"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  resizable = true,
  defaultSize,
  minSize = 360,
  maxSize = 1120,
  resizeStorageKey,
  style,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
  resizable?: boolean
  defaultSize?: number
  minSize?: number
  maxSize?: number
  resizeStorageKey?: string
}) {
  const getClampedSize = React.useCallback(
    (nextSize: number | undefined) => {
      if (nextSize == null || !Number.isFinite(nextSize)) return nextSize

      const viewportMax =
        typeof window === "undefined" ? maxSize : Math.max(minSize, window.innerWidth - 32)

      return Math.min(Math.max(nextSize, minSize), Math.min(maxSize, viewportMax))
    },
    [maxSize, minSize]
  )
  const getDefaultSheetSize = React.useCallback(() => {
    if (defaultSize != null && Number.isFinite(defaultSize)) return defaultSize
    if (typeof window === "undefined" || (side !== "right" && side !== "left")) return defaultSize
    if (window.innerWidth < 768) return defaultSize
    return window.innerWidth * 0.5
  }, [defaultSize, side])
  const [size, setSize] = React.useState(() => {
    const fallbackSize = getDefaultSheetSize()
    if (!resizeStorageKey || typeof window === "undefined") return fallbackSize

    const storedSize = window.localStorage.getItem(resizeStorageKey)
    const parsedSize = Number(storedSize)

    if (!Number.isFinite(parsedSize) || parsedSize <= 0) return fallbackSize

    const viewportMax = Math.max(minSize, window.innerWidth - 32)
    return Math.min(Math.max(parsedSize, minSize), Math.min(maxSize, viewportMax))
  })
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [resizeHandleX, setResizeHandleX] = React.useState<number | null>(null)
  const canResize = resizable && (side === "right" || side === "left")

  const clampSize = React.useCallback(
    (nextSize: number) => {
      const viewportMax = typeof window === "undefined" ? maxSize : window.innerWidth - 32
      return Math.min(Math.max(nextSize, minSize), Math.min(maxSize, viewportMax))
    },
    [maxSize, minSize]
  )

  React.useEffect(() => {
    if (!canResize) return

    let cancelled = false
    window.setTimeout(() => {
      if (cancelled) return
      setSize((currentSize) => {
        const nextSize = getClampedSize(currentSize ?? getDefaultSheetSize())
        if (resizeStorageKey && nextSize != null) {
          window.localStorage.setItem(resizeStorageKey, String(nextSize))
        }
        return nextSize
      })
    }, 0)

    return () => {
      cancelled = true
    }
  }, [canResize, getClampedSize, getDefaultSheetSize, resizeStorageKey])

  const updateResizeHandlePosition = React.useCallback(() => {
    const node = contentRef.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    setResizeHandleX(side === "right" ? rect.left : rect.right)
  }, [side])

  React.useLayoutEffect(() => {
    if (!canResize) return

    updateResizeHandlePosition()
    const animationFrame = window.requestAnimationFrame(updateResizeHandlePosition)
    const secondAnimationFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(updateResizeHandlePosition)
    })
    const timeout = window.setTimeout(updateResizeHandlePosition, 260)
    const finalTimeout = window.setTimeout(updateResizeHandlePosition, 420)
    const node = contentRef.current
    const observer =
      node && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateResizeHandlePosition)
        : null

    if (node) observer?.observe(node)
    node?.addEventListener("transitionend", updateResizeHandlePosition)
    node?.addEventListener("animationend", updateResizeHandlePosition)
    window.addEventListener("resize", updateResizeHandlePosition)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.cancelAnimationFrame(secondAnimationFrame)
      window.clearTimeout(timeout)
      window.clearTimeout(finalTimeout)
      node?.removeEventListener("transitionend", updateResizeHandlePosition)
      node?.removeEventListener("animationend", updateResizeHandlePosition)
      observer?.disconnect()
      window.removeEventListener("resize", updateResizeHandlePosition)
    }
  }, [canResize, size, updateResizeHandlePosition])

  const startResize = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!canResize) return

      event.preventDefault()
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        // Some browsers can throw if the pointer capture target changes during portal updates.
      }

      const updateSize = (pointerEvent: PointerEvent) => {
        pointerEvent.preventDefault()
        const nextSize =
          side === "right"
            ? window.innerWidth - pointerEvent.clientX
            : pointerEvent.clientX
        setSize(clampSize(nextSize))
      }

      const stopResize = () => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        document.removeEventListener("pointermove", updateSize)
        document.removeEventListener("pointerup", stopResize)
        document.removeEventListener("pointercancel", stopResize)
        if (resizeStorageKey) {
          setSize((currentSize) => {
            if (currentSize != null) {
              window.localStorage.setItem(resizeStorageKey, String(currentSize))
            }
            return currentSize
          })
        }
      }

      updateSize(event.nativeEvent)
      document.addEventListener("pointermove", updateSize, { passive: false })
      document.addEventListener("pointerup", stopResize)
      document.addEventListener("pointercancel", stopResize)
    },
    [canResize, clampSize, resizeStorageKey, side]
  )

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={(node) => {
          contentRef.current = node
          if (node) window.requestAnimationFrame(updateResizeHandlePosition)
        }}
        data-slot="sheet-content"
        data-side={side}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest("[data-sheet-resize-handle]")) {
            event.preventDefault()
            return
          }
          onPointerDownOutside?.(event)
        }}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          canResize && size != null && "data-[side=left]:w-auto data-[side=right]:w-auto sm:max-w-none",
          className
        )}
        style={
          canResize && size != null
            ? {
                ...style,
                width: size,
                maxWidth: "calc(100vw - 2rem)",
              }
            : style
        }
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-4 right-4"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
      {canResize && resizeHandleX != null && (
        <button
          type="button"
          data-sheet-resize-handle
          aria-label="Resize sheet"
          onPointerDownCapture={startResize}
          className="pointer-events-auto fixed top-1/2 z-50 flex h-16 w-6 -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none appearance-none items-center justify-center border-0 bg-transparent p-0 outline-none after:h-11 after:w-1.5 after:rounded-full after:bg-muted-foreground/70 after:transition-colors hover:after:bg-primary/75 focus-visible:after:bg-primary/75"
          style={{ left: resizeHandleX }}
        />
      )}
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-heading font-medium text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
