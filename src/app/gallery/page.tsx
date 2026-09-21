"use client";

import { useEffect, useState } from "react";
import { Images } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPublicGallery } from "@/lib/api";

interface GalleryImage {
  id: string;
  title?: string;
  imageUrl?: string;
  caption?: string;
  timestamp?: number;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadGallery() {
      const gallery = await getPublicGallery();
      if (!isMounted) return;
      setImages(gallery.map((image) => ({
        id: image._id,
        title: image.title,
        imageUrl: image.imageUrl,
        caption: image.caption,
        timestamp: image.createdAt ? Date.parse(image.createdAt) : undefined,
      })));
    }

    void loadGallery();
    const interval = window.setInterval(loadGallery, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="sport-heading text-5xl font-black tracking-tighter text-primary">Gallery</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Photos from matches, teams, and MSU Invicta event moments.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {images.length > 0 ? images.map((image) => (
          <Card key={image.id} className="overflow-hidden p-0">
            {image.imageUrl ? <img src={image.imageUrl} alt={image.title || "Gallery image"} className="h-64 w-full object-cover" /> : null}
            <div className="p-5">
              <h2 className="font-black text-foreground">{image.title || "Event Photo"}</h2>
              {image.caption && <p className="mt-1 text-sm font-medium text-muted-foreground">{image.caption}</p>}
            </div>
          </Card>
        )) : (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
            <Images size={44} className="mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Gallery photos will appear here after upload.</p>
          </div>
        )}
      </div>
    </div>
  );
}
