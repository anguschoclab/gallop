import { useGame, useGameWithShallow } from "@/game/store";

export function useGazetteData() {
  const day = useGame((s) => s.day);
  const { news } = useGameWithShallow((s) => ({ news: s.news }));

  const highImportance = news.filter((n) => n.importance === "high");
  const mediumImportance = news.filter((n) => n.importance === "medium");
  const lowImportance = news.filter((n) => n.importance === "low");

  const mainNews = [...highImportance, ...mediumImportance].slice(0, 8);
  const sideNews = lowImportance.slice(0, 12);

  return {
    day,
    mainNews,
    sideNews,
  };
}
