/**
 * Lightweight AI & Heuristic Category Classifier
 * Token-optimized, fast, deterministic classifier for bank & card transactions.
 */

export interface ClassificationResult {
  category: string;
  confidence: number;
  matchedKeywords: string[];
  rationale: string;
}

// Normalized keyword dictionaries mapped to standard categories
interface CategoryRulePattern {
  category: string;
  weight: number; // confidence score base
  exactOrPrefix: string[];
  keywords: string[];
}

const CATEGORY_PATTERNS: CategoryRulePattern[] = [
  {
    category: "Supermercado",
    weight: 0.95,
    exactOrPrefix: [
      "mercadona",
      "carrefour",
      "lidl",
      "alcampo",
      "eroski",
      "dia",
      "aldi",
      "supercor",
      "bonpreu",
      "consum",
      "hipercor",
      "ahorramas",
      "caprabo",
      "spar",
      "costco",
      "condis",
      "froiz",
      "gadis",
      "la sirena",
      "e leclerc",
      "bm supermercados",
    ],
    keywords: [
      "supermercado",
      "supermercados",
      "hipermercado",
      "alimentacion",
      "ultramarinos",
      "fruteria",
      "carniceria",
      "pescaderia",
      "panaderia",
      "charcuteria",
      "groceries",
      "supermarket",
    ],
  },
  {
    category: "Hogar & Luz",
    weight: 0.95,
    exactOrPrefix: [
      "iberdrola",
      "endesa",
      "naturgy",
      "totalenergies",
      "holaluz",
      "curenergia",
      "canal de isabel ii",
      "aqualia",
      "emasesa",
      "vodafone",
      "movistar",
      "orange",
      "digi",
      "yoigo",
      "pepephone",
      "masmovil",
      "lowi",
      "o2",
      "jazztel",
      "securitas direct",
      "prosegur",
    ],
    keywords: [
      "electricidad",
      "luz",
      "gas natural",
      "energia",
      "factura agua",
      "suministro agua",
      "telecomunicaciones",
      "fibra",
      "comunidad de propietarios",
      "recibo comunidad",
      "alquiler",
      "hipoteca",
      "seguro hogar",
      "cerrajeria",
      "fontaneria",
      "electricista",
    ],
  },
  {
    category: "Restaurantes & Ocio",
    weight: 0.95,
    exactOrPrefix: [
      "tagliatella",
      "foster",
      "goiko",
      "mcdonald",
      "burger king",
      "kfc",
      "starbucks",
      "rodilla",
      "pans & company",
      "ginos",
      "vips",
      "100 montaditos",
      "telepizza",
      "dominos pizza",
      "tgb the good burger",
      "five guys",
      "subway",
      "yelmo cines",
      "cinesa",
      "kinepolis",
      "netflix",
      "spotify",
      "disney+",
      "disney plus",
      "hbo",
      "hbomax",
      "playstation",
      "steam",
      "nintendo",
      "twitch",
      "dazn",
      "prime video",
    ],
    keywords: [
      "restaurante",
      "restauracion",
      "cafeteria",
      "bar ",
      "cerveceria",
      "taberna",
      "meson",
      "pizzeria",
      "hamburgueseria",
      "heladeria",
      "taperia",
      "bistrot",
      "trattoria",
      "sushi",
      "cinema",
      "teatro",
      "concierto",
      "discoteca",
      "pub",
      "ocio",
      "entradas",
      "ticketmaster",
      "just eat",
      "glovo",
      "ubereats",
    ],
  },
  {
    category: "Transporte & Gasolina",
    weight: 0.95,
    exactOrPrefix: [
      "repsol",
      "cepsa",
      "bp",
      "shell",
      "galp",
      "petroprix",
      "plenoil",
      "ballenoil",
      "renfe",
      "adif",
      "metro de madrid",
      "tmb",
      "emt",
      "alsa",
      "avanza",
      "uber",
      "cabify",
      "bolt",
      "free now",
      "bicing",
      "bicimad",
      "dgt",
      "autopistas",
      "aparcamientos",
      "empark",
      "saba",
      "eysa",
      "bip&drive",
      "via t",
    ],
    keywords: [
      "gasolina",
      "gasolinera",
      "combustible",
      "diesel",
      "estacion de servicio",
      "peaje",
      "aparcamiento",
      "parking",
      "parquimetro",
      "billete tren",
      "abono transporte",
      "taxi",
      "aeropuerto",
      "vueling",
      "iberia",
      "ryanair",
      "peajes",
    ],
  },
  {
    category: "Salud & Farmacia",
    weight: 0.95,
    exactOrPrefix: [
      "sanitas",
      "adeslas",
      "asisa",
      "mapfre salud",
      "general optica",
      "alain afflelou",
      "visionlab",
      "dental",
      "vitaldent",
      "quiron",
    ],
    keywords: [
      "farmacia",
      "farmaceutico",
      "botica",
      "parafarmacia",
      "optica",
      "clinica dental",
      "dentista",
      "fisioterapia",
      "podologia",
      "psicologia",
      "medico",
      "hospital",
      "analisis clinicos",
      "veterinario",
      "veterinaria",
    ],
  },
  {
    category: "Compras & Ropa",
    weight: 0.9,
    exactOrPrefix: [
      "zara",
      "bershka",
      "stradivarius",
      "pull&bear",
      "massimo dutti",
      "mango",
      "oysho",
      "primark",
      "h&m",
      "el corte ingles",
      "amazon",
      "decathlon",
      "ikea",
      "leroy merlin",
      "bricomart",
      "bauhaus",
      "fnac",
      "media markt",
      "apple store",
      "shein",
      "zalando",
      "aliexpress",
      "sprinter",
      "foot locker",
    ],
    keywords: [
      "moda",
      "ropa",
      "calzado",
      "zapateria",
      "tienda de ropa",
      "decoracion",
      "muebles",
      "bricolaje",
      "ferreteria",
      "electronica",
      "libreria",
      "jugueteria",
    ],
  },
  {
    category: "Ingreso / Nómina",
    weight: 0.95,
    exactOrPrefix: [
      "tgss",
      "seguridad social",
      "sepe",
      "aeat",
      "hacienda",
    ],
    keywords: [
      "nomina",
      "salario",
      "sueldo",
      "pension",
      "haberes",
      "retribucion",
      "transferencia a su favor",
      "abono nomina",
    ],
  },
  {
    category: "Liquidación / Neteo",
    weight: 0.95,
    exactOrPrefix: [
      "bizum",
    ],
    keywords: [
      "bizum",
      "liquidacion",
      "compensacion",
      "traspaso cuenta conjunta",
      "neteo cuentas",
    ],
  },
];

/**
 * Normalizes text for semantic classification:
 * lowercase, removes accents, removes punctuation, trims spaces.
 */
export function normalizeConcept(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics / accents
    .replace(/[^a-z0-9\s]/g, " ") // replace punctuation with space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classifies a transaction concept / merchant string using lightweight AI heuristics.
 */
export function classifyConcept(concept: string): ClassificationResult {
  const normalized = normalizeConcept(concept);
  if (!normalized) {
    return {
      category: "Otros Gastos Comunes",
      confidence: 0.2,
      matchedKeywords: [],
      rationale: "Concepto vacío",
    };
  }

  // 1. Check exact or prefix match against known brands/merchants
  for (const pattern of CATEGORY_PATTERNS) {
    for (const brand of pattern.exactOrPrefix) {
      const normBrand = normalizeConcept(brand);
      // Match whole word or prefix at start/boundaries
      const regex = new RegExp(`\\b${normBrand}\\b`, "i");
      if (regex.test(normalized) || normalized.startsWith(normBrand)) {
        return {
          category: pattern.category,
          confidence: pattern.weight,
          matchedKeywords: [brand],
          rationale: `Reconocimiento directo de comercio: ${brand}`,
        };
      }
    }
  }

  // 2. Check keyword dictionary matches
  let bestMatch: { pattern: CategoryRulePattern; keyword: string; score: number } | null = null;

  for (const pattern of CATEGORY_PATTERNS) {
    for (const kw of pattern.keywords) {
      const normKw = normalizeConcept(kw);
      if (normalized.includes(normKw)) {
        const score = pattern.weight * 0.9;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { pattern, keyword: kw, score };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      category: bestMatch.pattern.category,
      confidence: Math.round(bestMatch.score * 100) / 100,
      matchedKeywords: [bestMatch.keyword],
      rationale: `Clasificado por palabra clave: ${bestMatch.keyword}`,
    };
  }

  // 3. Fallback
  return {
    category: "Otros Gastos Comunes",
    confidence: 0.3,
    matchedKeywords: [],
    rationale: "Categoría por defecto (sin coincidencia semántica)",
  };
}
