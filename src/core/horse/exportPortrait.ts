import type { Horse } from "@/game/types";
import { getOrDeriveAppearance } from "@/core/horse/proceduralPortrait";

/**
 * Render a procedural horse portrait to a PNG and trigger a download.
 * Works fully client-side: serializes the rendered SVG, draws it onto a
 * canvas at the requested resolution, and saves via an anchor click.
 */
export async function exportHorsePortraitPng(
  horse: Pick<Horse, "id" | "name" | "coatColor" | "markings" | "gender" | "appearance">,
  options: { view?: "head" | "full"; size?: number; filename?: string } = {},
): Promise<void> {
  const view = options.view ?? "full";
  const size = options.size ?? 1024;
  const filename =
    options.filename ?? `${(horse.name ?? "horse").replace(/[^a-z0-9]+/gi, "_")}_${view}.png`;

  // Render the SVG off-DOM by mounting a temporary container.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ProceduralHorsePortrait } = await import("@/components/ProceduralHorsePortrait");
  const { createElement } = await import("react");

  // Ensure DNA is resolved so the same look is exported.
  const appearance = getOrDeriveAppearance(
    horse.id,
    horse.coatColor,
    horse.markings,
    horse.appearance,
  );

  const svgMarkup = renderToStaticMarkup(
    createElement(ProceduralHorsePortrait, {
      id: horse.id,
      coatColor: horse.coatColor,
      markings: horse.markings,
      gender: horse.gender,
      appearance,
      view,
      alt: horse.name ?? "Horse portrait",
    }),
  );

  const aspect = view === "full" ? 360 / 280 : 1;
  const w = view === "full" ? Math.round(size * aspect) : size;
  const h = size;

  // Rasterize via Image + canvas.
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
