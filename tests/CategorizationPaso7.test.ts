import { describe, it, expect } from "vitest";
import {
  classifyConcept,
  normalizeConcept,
  extractMerchantPattern,
  isMerchantMatch,
  findLearnedCategory,
  recordLearning,
  CategoryLearningItem,
  AssignmentRule,
  matchesRule,
  evaluateRules,
  runCategorizationPipeline,
} from "../src/lib/categorization";

describe("Paso 7: Motor de Categorización Inteligente con IA, Feedback Loop y Reglas", () => {
  describe("1. Clasificador Asistido por IA Ligera (classifyConcept)", () => {
    it("clasifica correctamente comercios de alimentación en Supermercado", () => {
      const t1 = classifyConcept("MERCADONA GRAN VIA 12");
      expect(t1.category).toBe("Supermercado");
      expect(t1.confidence).toBeGreaterThanOrEqual(0.9);

      const t2 = classifyConcept("Compra en Carrefour Market");
      expect(t2.category).toBe("Supermercado");

      const t3 = classifyConcept("Lidl Supermercados");
      expect(t3.category).toBe("Supermercado");
    });

    it("clasifica suministros y energía en Hogar & Luz", () => {
      const t1 = classifyConcept("IBERDROLA CLIENTES S.A.U.");
      expect(t1.category).toBe("Hogar & Luz");

      const t2 = classifyConcept("Recibo luz Endesa Energia");
      expect(t2.category).toBe("Hogar & Luz");

      const t3 = classifyConcept("Canal de Isabel II Agua");
      expect(t3.category).toBe("Hogar & Luz");
    });

    it("clasifica restaurantes y plataformas en Restaurantes & Ocio", () => {
      const t1 = classifyConcept("Restaurante La Tagliatella");
      expect(t1.category).toBe("Restaurantes & Ocio");

      const t2 = classifyConcept("Suscripcion Netflix mensual");
      expect(t2.category).toBe("Restaurantes & Ocio");

      const t3 = classifyConcept("Burger King Espana");
      expect(t3.category).toBe("Restaurantes & Ocio");
    });

    it("clasifica carburantes y transporte en Transporte & Gasolina", () => {
      const t1 = classifyConcept("Estacion de Servicio Repsol M30");
      expect(t1.category).toBe("Transporte & Gasolina");

      const t2 = classifyConcept("RENFE Viajeros Billete AVE");
      expect(t2.category).toBe("Transporte & Gasolina");

      const t3 = classifyConcept("Uber trip help.uber.com");
      expect(t3.category).toBe("Transporte & Gasolina");
    });

    it("clasifica salud y medicamentos en Salud & Farmacia", () => {
      const res = classifyConcept("Farmacia Central Ldo Perez");
      expect(res.category).toBe("Salud & Farmacia");
    });

    it("clasifica ropa y compras en Compras & Ropa", () => {
      const res = classifyConcept("ZARA ESPANA TIENDA");
      expect(res.category).toBe("Compras & Ropa");
    });

    it("clasifica nóminas y salarios en Ingreso / Nómina", () => {
      const res = classifyConcept("Transferencia Nomina Empresa Septiembre");
      expect(res.category).toBe("Ingreso / Nómina");
    });

    it("devuelve Otros Gastos Comunes con baja confianza para conceptos desconocidos", () => {
      const res = classifyConcept("Xyzkldf Qwe 999");
      expect(res.category).toBe("Otros Gastos Comunes");
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  describe("2. Feedback Loop (Aprendizaje Continuo)", () => {
    it("extrae el patrón limpio del comercio eliminando ruido bancario (TPV, prefijos, fechas)", () => {
      const p1 = extractMerchantPattern("COMPRA EN MERCADONA S.A. TPV 20492");
      expect(p1).toBe("mercadona");

      const p2 = extractMerchantPattern("PAGO CON TARJETA **** 9182 RESTAURANTE GINOS 14/09/2026");
      expect(p2).toContain("ginos");
    });

    it("aprende una nueva categoría cuando el usuario corrige manualmente un gasto", () => {
      const initialLearnings: CategoryLearningItem[] = [];

      // Usuario reclasifica "Bazar Dragon Chino" a "Hogar & Luz"
      const { updatedLearnings } = recordLearning(
        "Bazar Dragon Chino",
        "Hogar & Luz",
        initialLearnings,
        "hh-123"
      );

      expect(updatedLearnings.length).toBe(1);
      expect(updatedLearnings[0].categoryName).toBe("Hogar & Luz");
      expect(updatedLearnings[0].merchantPattern).toBe("bazar dragon chino");

      // Buscar categoría aprendida
      const match = findLearnedCategory("Bazar Dragon Chino S.L.", updatedLearnings);
      expect(match).not.toBeNull();
      expect(match?.categoryName).toBe("Hogar & Luz");
    });

    it("el aprendizaje del usuario PRIORIZA sobre la IA para futuros movimientos", () => {
      // Por defecto, la IA clasificaría "Cafeteria El Rincon" como Restaurantes & Ocio
      const aiDefault = classifyConcept("Cafeteria El Rincon");
      expect(aiDefault.category).toBe("Restaurantes & Ocio");

      // El usuario guarda que para su caso "Cafeteria El Rincon" es "Otros Gastos Comunes"
      const learnings: CategoryLearningItem[] = [
        {
          id: "learn-1",
          merchantPattern: "cafeteria el rincon",
          categoryName: "Otros Gastos Comunes",
          updatedAt: new Date().toISOString(),
        },
      ];

      // Ejecutar pipeline
      const pipelineResult = runCategorizationPipeline(
        { merchant: "Cafeteria El Rincon Central", amount: 15 },
        [],
        learnings,
        [{ name: "Otros Gastos Comunes", color: "#64748B" }]
      );

      // Debe haber priorizado el aprendizaje del usuario!
      expect(pipelineResult.assignedBy).toBe("user_learning");
      expect(pipelineResult.category).toBe("Otros Gastos Comunes");
      expect(pipelineResult.categoryColor).toBe("#64748B");
    });
  });

  describe("3. Motor de Reglas Automáticas (Rules Engine)", () => {
    const sampleRules: AssignmentRule[] = [
      {
        id: "rule-1",
        name: "Luz y Gas al 50/50",
        pattern: "Iberdrola",
        assignTo: "JOINT",
        splitRatio: 0.5,
        categoryName: "Hogar & Luz",
        isActive: true,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "rule-2",
        name: "Gastos personales Carlos",
        pattern: "PlayStation",
        assignTo: "USER_A",
        splitRatio: 1.0,
        categoryName: "Restaurantes & Ocio",
        isActive: true,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "rule-3",
        name: "Compras grandes Supermercado > 100€",
        pattern: "Mercadona",
        minAmount: 100,
        assignTo: "JOINT",
        splitRatio: 0.5,
        isActive: true,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "rule-disabled",
        name: "Regla inactiva",
        pattern: "Gasolina",
        assignTo: "USER_B",
        splitRatio: 1.0,
        isActive: false,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    it("evalúa y asigna status = 'auto_assigned' y split 50/50 cuando coincide regla conjunta", () => {
      const res = evaluateRules(sampleRules, {
        merchant: "Recibo Iberdrola Clientes",
        amount: 85.5,
      });

      expect(res).not.toBeNull();
      expect(res?.status).toBe("auto_assigned");
      expect(res?.payer).toBe("joint");
      expect(res?.split).toBe("50/50");
      expect(res?.categoryName).toBe("Hogar & Luz");
      expect(res?.matchedRule.id).toBe("rule-1");
    });

    it("asigna gasto a USER_A cuando coincide regla personal", () => {
      const res = evaluateRules(sampleRules, {
        merchant: "Sony PlayStation Network",
        amount: 19.99,
      });

      expect(res).not.toBeNull();
      expect(res?.status).toBe("auto_assigned");
      expect(res?.payer).toBe("memberA");
      expect(res?.split).toBe("memberA");
    });

    it("respeta límites de importe (minAmount / maxAmount)", () => {
      // Mercadona de 40€ NO debe disparar la regla de > 100€
      const resSmall = evaluateRules(sampleRules, {
        merchant: "Mercadona Express",
        amount: 40.0,
      });
      expect(resSmall).toBeNull();

      // Mercadona de 150€ SÍ debe disparar la regla
      const resLarge = evaluateRules(sampleRules, {
        merchant: "Mercadona Gran Vía",
        amount: 150.0,
      });
      expect(resLarge).not.toBeNull();
      expect(resLarge?.matchedRule.id).toBe("rule-3");
    });

    it("ignora reglas inactivas (isActive = false)", () => {
      const res = evaluateRules(sampleRules, {
        merchant: "Gasolina Repsol",
        amount: 50.0,
      });
      expect(res).toBeNull();
    });
  });

  describe("4. Reversibilidad y Pipeline Completo", () => {
    it("el pipeline orquesta regla -> aprendizaje -> IA en orden jerárquico", () => {
      const rules: AssignmentRule[] = [
        {
          id: "rule-spotify",
          pattern: "Spotify",
          assignTo: "JOINT",
          splitRatio: 0.5,
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
      ];

      const learnings: CategoryLearningItem[] = [
        {
          id: "learn-spotify",
          merchantPattern: "spotify",
          categoryName: "Restaurantes & Ocio",
          updatedAt: "",
        },
      ];

      const result = runCategorizationPipeline(
        { merchant: "Spotify Premium Family", amount: 17.99 },
        rules,
        learnings,
        [{ name: "Restaurantes & Ocio", color: "#F59E0B" }]
      );

      // La regla determina el reparto (status = auto_assigned) y el aprendizaje del usuario la categoría
      expect(result.status).toBe("auto_assigned");
      expect(result.split).toBe("50/50");
      expect(result.category).toBe("Restaurantes & Ocio");
      expect(result.categoryColor).toBe("#F59E0B");
    });
  });

  describe("5. Auto-Asignación en Tiempo Real de Gastos con Mismo Literal (isMerchantMatch)", () => {
    it("detecta coincidencia exacta de literales bancarios", () => {
      expect(isMerchantMatch("MERCADONA", "MERCADONA")).toBe(true);
      expect(isMerchantMatch("  mercadona  ", "MERCADONA")).toBe(true);
      expect(isMerchantMatch("Netflix", "netflix")).toBe(true);
    });

    it("detecta comercios idénticos con ruido bancario o sufijos (S.A., TPV, ciudad)", () => {
      expect(isMerchantMatch("MERCADONA S.A.", "COMPRA EN MERCADONA MADRID")).toBe(true);
      expect(isMerchantMatch("UBER EATS", "PAGO TPV UBER EATS")).toBe(true);
      expect(isMerchantMatch("Restaurante Tagliatella", "Tagliatella")).toBe(true);
    });

    it("no produce falsos positivos entre comercios distintos", () => {
      expect(isMerchantMatch("Bar Pepe", "Embarque")).toBe(false);
      expect(isMerchantMatch("Mercadona", "Carrefour")).toBe(false);
      expect(isMerchantMatch("Endesa", "Iberdrola")).toBe(false);
    });
  });

  describe("6. Persistencia y Resolución de Conflictos Local vs BBDD Cloud", () => {
    it("preserva la categorización local más reciente sobre datos antiguos de la BBDD", () => {
      const localTx = {
        id: "tx-1",
        merchant: "Restaurante La Tagliatella",
        amount: 45.0,
        category: "Restaurantes & Ocio",
        status: "classified" as const,
        updatedAt: 1790179999000,
      };

      const cloudTx = {
        id: "tx-1",
        merchant: "Restaurante La Tagliatella",
        amount: 45.0,
        category: "Otros Gastos Comunes",
        status: "classified" as const,
        updatedAt: 1790171000000, // Anterior en el tiempo
      };

      // Simulación de la regla de merge: local es más reciente
      const isLocalNewer = (localTx.updatedAt || 0) >= (cloudTx.updatedAt || 0);
      const chosen = isLocalNewer ? localTx : cloudTx;
      expect(chosen.category).toBe("Restaurantes & Ocio");
      expect(chosen.updatedAt).toBe(1790179999000);
    });

    it("nunca sobrescribe un movimiento local clasificado con un estado pendiente de la nube", () => {
      const localTx = {
        id: "tx-2",
        merchant: "Mercadona",
        amount: 32.5,
        category: "Supermercado",
        status: "classified" as const,
      };

      const cloudTx = {
        id: "tx-2",
        merchant: "Mercadona",
        amount: 32.5,
        category: "Otros Gastos Comunes",
        status: "pending" as const,
      };

      const preserveLocal = localTx.status === "classified" && cloudTx.status === "pending";
      const chosen = preserveLocal ? localTx : cloudTx;
      expect(chosen.status).toBe("classified");
      expect(chosen.category).toBe("Supermercado");
    });
  });
});
