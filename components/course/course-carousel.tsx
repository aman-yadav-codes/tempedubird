"use client";

import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface Props {
  images: {
    id: number;
    url: string;
  }[];

  title: string;

  verified: boolean;
}

export function CourseCarousel({
  images,
  title,
  verified,
}: Props) {
  return (
    <Carousel
      className="w-full"
      plugins={[
        Autoplay({
          delay: 3000,
        }),
      ]}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {images.map((image) => (
          <CarouselItem key={image.id}>
            <div className="relative h-72 w-full overflow-hidden rounded-xl">
              <Image
                src={image.url}
                alt={title}
                fill
                className="object-cover"
              />

              {verified && (
                <div className="absolute left-3 top-3">
                  <div className="rounded-md bg-green-500/90 px-3 py-1 text-sm text-white">
                    Verified
                  </div>
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}