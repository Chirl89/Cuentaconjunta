import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortControls } from "../src/components/SortControls";
import { useTransactionSort } from "../src/hooks/useTransactionSort";
import { renderHook, act } from "@testing-library/react";
import { sortTransactionsList } from "../src/lib/sorting";

describe("Paso 12.13: Ordenación en Todas las Vistas (Resumen Mensual, Gastos Conjuntos, Gastos Carlos)", () => {
  it("renders SortControls with Fecha, Importe, Categoría buttons and shows active indicator", () => {
    const onSortClick = vi.fn();
    const { rerender } = render(
      <SortControls criterion="fecha" direction="desc" onSortClick={onSortClick} theme="indigo" />
    );

    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Importe")).toBeInTheDocument();
    expect(screen.getByText("Categoría")).toBeInTheDocument();
    expect(screen.getByText("↓")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Importe"));
    expect(onSortClick).toHaveBeenCalledWith("importe");

    // Rerender with importe desc
    rerender(
      <SortControls criterion="importe" direction="desc" onSortClick={onSortClick} theme="indigo" />
    );
    expect(screen.getByText("↓")).toBeInTheDocument();

    // Rerender with categoria asc
    rerender(
      <SortControls criterion="categoria" direction="asc" onSortClick={onSortClick} theme="indigo" />
    );
    expect(screen.getByText("A→Z")).toBeInTheDocument();
  });

  it("useTransactionSort hook toggles directions and handles criterion changes", () => {
    const { result } = renderHook(() => useTransactionSort("fecha", "desc"));

    expect(result.current.criterion).toBe("fecha");
    expect(result.current.direction).toBe("desc");

    // Click same criterion toggles direction
    act(() => {
      result.current.handleSortClick("fecha");
    });
    expect(result.current.criterion).toBe("fecha");
    expect(result.current.direction).toBe("asc");

    // Click another criterion defaults to desc (or asc for categoria)
    act(() => {
      result.current.handleSortClick("importe");
    });
    expect(result.current.criterion).toBe("importe");
    expect(result.current.direction).toBe("desc");
    expect(result.current.prevCriterion).toBe("fecha");
    expect(result.current.prevDirection).toBe("asc");

    // Click categoria defaults to asc
    act(() => {
      result.current.handleSortClick("categoria");
    });
    expect(result.current.criterion).toBe("categoria");
    expect(result.current.direction).toBe("asc");
  });

  it("sortTransactionsList orders scoped movement items by amount, category and date accurately", () => {
    const items = [
      {
        id: "1",
        merchant: "ZARA",
        category: "Ropa",
        date: "2026-09-02",
        amount: 80.0,
      },
      {
        id: "2",
        merchant: "MERCADONA",
        category: "Alimentación",
        date: "2026-09-10",
        amount: 120.0,
      },
      {
        id: "3",
        merchant: "IBERDROLA",
        category: "Hogar",
        date: "2026-09-05",
        amount: 45.0,
      },
    ];

    // Sort by importe desc
    const byAmountDesc = sortTransactionsList(items, "importe", "desc");
    expect(byAmountDesc.map((i) => i.id)).toEqual(["2", "1", "3"]); // 120, 80, 45

    // Sort by importe asc
    const byAmountAsc = sortTransactionsList(items, "importe", "asc");
    expect(byAmountAsc.map((i) => i.id)).toEqual(["3", "1", "2"]); // 45, 80, 120

    // Sort by category asc (A-Z)
    const byCatAsc = sortTransactionsList(items, "categoria", "asc");
    expect(byCatAsc.map((i) => i.category)).toEqual(["Alimentación", "Hogar", "Ropa"]);

    // Sort by fecha desc
    const byFechaDesc = sortTransactionsList(items, "fecha", "desc");
    expect(byFechaDesc.map((i) => i.id)).toEqual(["2", "3", "1"]); // 10 Sept, 5 Sept, 2 Sept
  });
});
