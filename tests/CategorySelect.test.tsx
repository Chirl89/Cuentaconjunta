import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategorySelect } from "../src/components/CategorySelect";
import { CATEGORIES_LIST } from "../src/context/TransactionsContext";

describe("CategorySelect Component", () => {
  it("renders correctly with default categories and selected value", () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Supermercado" onChange={handleChange} theme="indigo" />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("Supermercado");
    expect(select.querySelectorAll("option").length).toBe(CATEGORIES_LIST.length);
  });

  it("calls onChange when a different category is selected", () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Supermercado" onChange={handleChange} theme="emerald" />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Transporte & Gasolina" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("Transporte & Gasolina");
  });

  it("handles custom or unlisted categories gracefully by adding an option", () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="CategoriaEspecial" onChange={handleChange} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("CategoriaEspecial");
    expect(screen.getByText("CategoriaEspecial")).toBeInTheDocument();
    expect(select.querySelectorAll("option").length).toBe(CATEGORIES_LIST.length + 1);
  });

  it("supports custom category list prop", () => {
    const customList = [
      { name: "Ahorro", color: "#10b981", icon: "💰" },
      { name: "Ocio", color: "#6366f1", icon: "🎉" },
    ];
    const handleChange = vi.fn();
    render(<CategorySelect value="Ocio" onChange={handleChange} categories={customList} theme="red" />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("Ocio");
    expect(select.querySelectorAll("option").length).toBe(2);
  });
});
