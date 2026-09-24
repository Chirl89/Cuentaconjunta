import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  TransactionsProvider,
  useTransactions,
  isSameMovement,
  normalizeDateToCanonical,
  normalizeConceptString,
  stripBankNoisePrefixes,
  areAccountsCompatible,
  type Transaction,
} from "../src/context/TransactionsContext";
import { UserNamesProvider } from "../src/context/UserNamesContext";
import { AuthProvider } from "../src/context/AuthContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <UserNamesProvider initialNames={{ memberA: "Carlos", memberB: "Andrea" }}>
      <TransactionsProvider>{children}</TransactionsProvider>
    </UserNamesProvider>
  </AuthProvider>
);

describe("Deduplicación Estricta de Movimientos de Tarjeta y Cuentas (Cero Duplicados)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("Funciones Canónicas de Normalización y Comparación", () => {
    it("normaliza cualquier formato de fecha a formato canónico YYYY-MM-DD", () => {
      expect(normalizeDateToCanonical("15/09/2026")).toBe("2026-09-15");
      expect(normalizeDateToCanonical("5/9/2026")).toBe("2026-09-05");
      expect(normalizeDateToCanonical("2026-09-15")).toBe("2026-09-15");
      expect(normalizeDateToCanonical("15-09-2026")).toBe("2026-09-15");
      expect(normalizeDateToCanonical("15 Sep", "2026-09")).toBe("2026-09-15");
      expect(normalizeDateToCanonical("15 Sep, 18:30", "2026-09")).toBe("2026-09-15");
      expect(normalizeDateToCanonical("10 Abr", "2026-04")).toBe("2026-04-10");
    });

    it("normaliza conceptos eliminando tildes, signos de puntuación y espacios redundantes", () => {
      expect(normalizeConceptString("  CAFÉ & RESTAURANTE, S.A.  ")).toBe("cafe restaurante s a");
      expect(normalizeConceptString("MERCADONA   MADRID - 28001")).toBe("mercadona madrid 28001");
      expect(normalizeConceptString("ZARA*ONLINE ES")).toBe("zara online es");
    });

    it("elimina prefijos y sufijos ruidosos del extracto bancario", () => {
      expect(stripBankNoisePrefixes("compra en mercadona s a")).toBe("mercadona");
      expect(stripBankNoisePrefixes("compra tpv repsol 28001")).toBe("repsol");
      expect(stripBankNoisePrefixes("pago con tarjeta carrefour")).toBe("carrefour");
      expect(stripBankNoisePrefixes("estacion de servicio cepsa")).toBe("cepsa");
    });

    it("comprueba compatibilidad de cuentas y tarjetas con diferentes variantes de nombre", () => {
      expect(areAccountsCompatible("Tarjeta VISA Clásica", "Visa Clásica")).toBe(true);
      expect(areAccountsCompatible("Tarjeta VISA (**** 3080)", "VISA **** 3080")).toBe(true);
      expect(areAccountsCompatible("Bankinter Débito", "Tarjeta Bankinter")).toBe(true);
      expect(areAccountsCompatible("Visa Clásica", "Santander Débito")).toBe(true); // Ambas son tarjetas
    });

    it("isSameMovement detecta duplicados independientemente del formato de fecha o pequeñas variaciones", () => {
      const existing: Transaction = {
        id: "tx-existing-1",
        merchant: "Mercadona",
        rawConcept: "COMPRA EN MERCADONA S.A. 4912",
        date: "15/09/2026",
        monthKey: "2026-09",
        amount: 45.5,
        category: "Supermercado",
        categoryColor: "#00D09C",
        accountLabel: "Tarjeta VISA Clásica",
        status: "classified", // ¡YA ASIGNADO!
        payer: "memberA",
        split: "50/50",
      };

      // Nuevo movimiento que llega en el nuevo CSV repetido
      const incomingRepeat = {
        id: "card_2026-09-15_45_50_mercadona_0",
        concept: "COMPRA EN MERCADONA S.A. 4912",
        amount: 45.5,
        date: "2026-09-15",
        monthKey: "2026-09",
        accountLabel: "Visa Clásica",
      };

      expect(isSameMovement(existing, incomingRepeat)).toBe(true);
    });

    it("isSameMovement NO empareja movimientos con importes o fechas distintas", () => {
      const existing: Transaction = {
        id: "tx-existing-1",
        merchant: "Mercadona",
        date: "15/09/2026",
        monthKey: "2026-09",
        amount: 45.5,
        category: "Supermercado",
        categoryColor: "#00D09C",
        accountLabel: "Tarjeta VISA",
        status: "pending",
        payer: "memberA",
        split: "50/50",
      };

      // Importe diferente
      expect(
        isSameMovement(existing, {
          concept: "Mercadona",
          amount: 46.0,
          date: "15/09/2026",
          monthKey: "2026-09",
        })
      ).toBe(false);

      // Fecha diferente
      expect(
        isSameMovement(existing, {
          concept: "Mercadona",
          amount: 45.5,
          date: "18/09/2026",
          monthKey: "2026-09",
        })
      ).toBe(false);

      // Comercio completamente diferente
      expect(
        isSameMovement(existing, {
          concept: "Farmacia Central",
          amount: 45.5,
          date: "15/09/2026",
          monthKey: "2026-09",
        })
      ).toBe(false);
    });
  });

  describe("importBankMovements: Integración con Estado de Triaje y Secciones Asignadas", () => {
    it("no duplica movimientos cuando el nuevo CSV repite compras que ya están asignadas a una sección", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // 1. Importación inicial del extracto de tarjeta (3 movimientos)
      act(() => {
        result.current.importBankMovements([
          {
            id: "card_mov_1",
            concept: "MERCADONA MADRID",
            amount: 52.3,
            date: "10/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_2",
            concept: "REPSOL GASOLINA",
            amount: 60.0,
            date: "11/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_3",
            concept: "RESTAURANTE GINOS",
            amount: 38.5,
            date: "12/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
        ]);
      });

      // Localizamos los movimientos importados
      const mercadona = result.current.transactions.find((t) => t.merchant.includes("MERCADONA"));
      const repsol = result.current.transactions.find((t) => t.merchant.includes("REPSOL"));
      const ginos = result.current.transactions.find((t) => t.merchant.includes("GINOS"));

      expect(mercadona).toBeDefined();
      expect(repsol).toBeDefined();
      expect(ginos).toBeDefined();

      // 2. El usuario interactúa y clasifica:
      // - Mercadona se asigna a 'Supermercado' y split '50/50'
      act(() => {
        result.current.classifyTransaction(mercadona!.id, "50/50");
      });
      // - Repsol se asigna a Andrea personal ('memberB')
      act(() => {
        result.current.classifyTransaction(repsol!.id, "memberB");
      });
      // - Ginos se queda en triaje (pending)

      const countBefore = result.current.transactions.length;

      // 3. Dos semanas después: el usuario sube un NUEVO extracto CSV que incluye:
      // - Los 3 movimientos repetidos de la semana anterior
      // - 2 movimientos nuevos (ZARA y FARMACIA)
      let importResult: { added: number; duplicates: number; total: number } = { added: 0, duplicates: 0, total: 0 };
      act(() => {
        importResult = result.current.importBankMovements([
          {
            id: "card_mov_1",
            concept: "MERCADONA MADRID",
            amount: 52.3,
            date: "10/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_2",
            concept: "REPSOL GASOLINA",
            amount: 60.0,
            date: "11/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_3",
            concept: "RESTAURANTE GINOS",
            amount: 38.5,
            date: "12/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_4_new",
            concept: "ZARA MODA",
            amount: 45.0,
            date: "20/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
          {
            id: "card_mov_5_new",
            concept: "FARMACIA GOYA",
            amount: 15.2,
            date: "21/09/2026",
            monthKey: "2026-09",
            accountLabel: "Tarjeta VISA Clásica",
          },
        ]);
      });

      // 4. Verificaciones estrictas
      expect(importResult.added).toBe(2); // Solo se añaden los 2 nuevos
      expect(importResult.duplicates).toBe(3); // Los 3 repetidos se reconocen como duplicados
      expect(result.current.transactions.length).toBe(countBefore + 2);

      // Verificar que los movimientos asignados PREVIAMENTE NO se han tocado ni duplicado
      const allMercadonas = result.current.transactions.filter((t) => t.merchant.includes("MERCADONA"));
      expect(allMercadonas.length).toBe(1); // CERO DUPLICADOS
      expect(allMercadonas[0].status).toBe("classified"); // Mantiene sección asignada
      expect(allMercadonas[0].split).toBe("50/50");

      const allRepsol = result.current.transactions.filter((t) => t.merchant.includes("REPSOL"));
      expect(allRepsol.length).toBe(1); // CERO DUPLICADOS
      expect(allRepsol[0].status).toBe("classified");
      expect(allRepsol[0].split).toBe("memberB"); // Mantiene asignación a Andrea

      const allGinos = result.current.transactions.filter((t) => t.merchant.includes("GINOS"));
      expect(allGinos.length).toBe(1); // CERO DUPLICADOS
      expect(allGinos[0].status).toBe("pending"); // Permanece en triaje
    });

    it("maneja compras idénticas el mismo día (mismo importe y comercio) con seguimiento de ocurrencias 1 a 1", () => {
      const { result } = renderHook(() => useTransactions(), { wrapper });

      // Dos billetes de autobús el mismo día por el mismo importe
      const sameDayMovements = [
        {
          id: "card_bus_0",
          concept: "EMT AUTOBUS MADRID",
          amount: 1.5,
          date: "14/09/2026",
          monthKey: "2026-09",
          accountLabel: "Tarjeta VISA",
        },
        {
          id: "card_bus_1",
          concept: "EMT AUTOBUS MADRID",
          amount: 1.5,
          date: "14/09/2026",
          monthKey: "2026-09",
          accountLabel: "Tarjeta VISA",
        },
      ];

      act(() => {
        result.current.importBankMovements(sameDayMovements);
      });

      const initialCount = result.current.transactions.filter((t) => t.merchant.includes("EMT AUTOBUS")).length;
      expect(initialCount).toBe(2);

      // El usuario clasifica uno de los billetes y deja el otro en triaje
      const buses = result.current.transactions.filter((t) => t.merchant.includes("EMT AUTOBUS"));
      act(() => {
        result.current.classifyTransaction(buses[0].id, "memberA");
      });

      // Se vuelve a cargar el extracto con los 2 billetes repetidos
      act(() => {
        const res = result.current.importBankMovements(sameDayMovements);
        expect(res.added).toBe(0);
        expect(res.duplicates).toBe(2);
      });

      const afterCount = result.current.transactions.filter((t) => t.merchant.includes("EMT AUTOBUS")).length;
      expect(afterCount).toBe(2); // Siguen habiendo exactamente 2, cero duplicados generados
    });
  });
});
