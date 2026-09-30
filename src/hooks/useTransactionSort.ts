import { useState } from "react";
import { SortCriterion, SortDirection } from "@/lib/sorting";

export function useTransactionSort(
  defaultCriterion: SortCriterion = "fecha",
  defaultDirection: SortDirection = "desc"
) {
  const [criterion, setCriterion] = useState<SortCriterion>(defaultCriterion);
  const [direction, setDirection] = useState<SortDirection>(defaultDirection);
  const [prevCriterion, setPrevCriterion] = useState<SortCriterion | null>(null);
  const [prevDirection, setPrevDirection] = useState<SortDirection | null>(null);

  const handleSortClick = (newCriterion: SortCriterion) => {
    if (criterion === newCriterion) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPrevCriterion(criterion);
      setPrevDirection(direction);
      setCriterion(newCriterion);
      setDirection(newCriterion === "categoria" ? "asc" : "desc");
    }
  };

  return {
    criterion,
    direction,
    prevCriterion,
    prevDirection,
    handleSortClick,
    setCriterion,
    setDirection,
  };
}
