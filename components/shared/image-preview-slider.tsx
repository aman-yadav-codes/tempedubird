"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Download } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import {
    Carousel,
    CarouselApi,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"

export interface MediaItem {
    src: string
    alt?: string
    type?: "image" | "video"
    poster?: string
}

interface ImagePreviewSliderProps {
    images: MediaItem[]
    previewWidth?: number
    previewHeight?: number
    priority?: boolean
    className?: string
}

export function ImagePreviewSlider({
    images,
    previewWidth = 500,
    previewHeight = 300,
    priority = false,
    className = "",
}: ImagePreviewSliderProps) {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    if (!images?.length) return null

    useEffect(() => {
        if (!api) return

        const onSelect = () => {
            setCurrent(api.selectedScrollSnap())
        }

        api.on("select", onSelect)

        return () => {
            api.off("select", onSelect)
        }
    }, [api])

    const handleThumbClick = (index: number) => {
        api?.scrollTo(index)
    }

    const currentItem = images[current]

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div
                    className={`group cursor-pointer overflow-hidden rounded-2xl ${className}`}
                >
                    {images[0].type === "video" ? (
                        <div className="relative">
                            {images[0].poster ? (
                                <Image
                                    priority={priority}
                                    loading={priority ? "eager" : "lazy"}
                                    src={images[0].poster}
                                    alt={images[0].alt || "Video preview"}
                                    width={previewWidth}
                                    height={previewHeight}
                                    className="h-auto w-full rounded-2xl object-cover transition duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <video className="h-auto w-full rounded-2xl object-cover">
                                    <source src={images[0].src} />
                                </video>
                            )}

                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-2xl text-white backdrop-blur-md">
                                    ▶
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Image
                            priority={priority}
                            loading={priority ? "eager" : "lazy"}
                            src={images[0].src}
                            alt={images[0].alt || "Preview image"}
                            width={previewWidth}
                            height={previewHeight}
                            className="h-auto w-full rounded-2xl object-cover transition duration-300 group-hover:scale-105"
                        />
                    )}
                </div>
            </DialogTrigger>

            <DialogContent className="overflow-hidden rounded-2xl border-none bg-black p-0 text-white sm:max-w-7xl">
                <DialogTitle className="sr-only">
                    Media Preview
                </DialogTitle>

                <DialogDescription className="sr-only">
                    Preview and navigate gallery media
                </DialogDescription>

                <div className="relative">
                    <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
                        <div className="rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-sm font-medium backdrop-blur-md">
                            {current + 1} / {images.length}
                        </div>

                        <a
                            href={currentItem.src}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition hover:bg-black/80"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                    </div>

                    <Carousel
                        opts={{
                            loop: true,
                        }}
                        setApi={setApi}
                        className="w-full"
                    >
                        <CarouselContent>
                            {images.map((item, index) => (
                                <CarouselItem key={index}>
                                    <div className="flex h-[80vh] items-center justify-center overflow-hidden bg-black">
                                        {item.type === "video" ? (
                                            <video
                                                controls
                                                poster={item.poster}
                                                className="max-h-[80vh] w-full object-contain"
                                            >
                                                <source src={item.src} />
                                            </video>
                                        ) : (
                                            <div className="relative h-full w-full">
                                                <Image
                                                    src={item.src}
                                                    alt={item.alt || `Gallery image ${index + 1}`}
                                                    fill
                                                    sizes="100vw"
                                                    className="object-cover object-center"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>

                        <CarouselPrevious className="left-4 h-11 w-11 border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/80" />
                        <CarouselNext className="right-4 h-11 w-11 border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/80" />
                    </Carousel>

                    <div className="flex items-center justify-center gap-3 overflow-x-auto border-t border-zinc-800 bg-black p-4">
                        {images.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleThumbClick(index)}
                                className={`overflow-hidden rounded-xl border-2 transition-all ${current === index
                                        ? "scale-105 border-white"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                    }`}
                            >
                                {item.type === "video" ? (
                                    <div className="relative flex h-16 w-24 items-center justify-center bg-zinc-900">
                                        {item.poster ? (
                                            <Image
                                                src={item.poster}
                                                alt="Video thumbnail"
                                                width={120}
                                                height={80}
                                                className="h-16 w-24 object-cover"
                                            />
                                        ) : null}

                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                            ▶
                                        </div>
                                    </div>
                                ) : (
                                    <Image
                                        src={item.src}
                                        alt={item.alt || `Thumbnail ${index + 1}`}
                                        width={120}
                                        height={80}
                                        className="h-16 w-24 object-cover"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
