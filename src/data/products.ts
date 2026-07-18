export interface Product {
  id: string;
  name: string;
  category: string;
  composition: string;
  benefits: string[];
  usage: string;
  packSize: string;
  mrp: number;
  shelfLife: string;
  safetyNote: string;
  image?: string; // Image path reference
  transparentImage?: string; // Transparent image path reference
}

export const products: Product[] = [
  {
    id: "dr-lion-pain-cream",
    name: "Dr. Lion Pain Cream",
    category: "Ayurvedic External Pain Relief Cream",
    composition: "Sarsapa Thila (30 ml), Thymol (10 ml), Menthol (10 ml), Camphor (10 ml), Bees Wax (40 g) per 100 gms as shown on label",
    benefits: [
      "Supports joint comfort",
      "Helps soothe muscle discomfort",
      "Cooling herbal formulation",
      "Easy external application"
    ],
    usage: "Apply an adequate amount to the affected area and gently massage until absorbed. Use as directed on label or by a qualified healthcare professional.",
    packSize: "500 gms",
    mrp: 2999,
    shelfLife: "3 Years",
    safetyNote: "Ayurvedic cream for external use only",
    image: "/products/Dr lion pain cream/Pain cream front view.webp",
    transparentImage: "/products/Dr lion pain cream/Pain cream front view.webp"
  },
  {
    id: "dr-lion-pain-pills",
    name: "Dr. Lion Pain Pills",
    category: "Ayurvedic Proprietary Medicine",
    composition: "Hingula Shuddha/Purified, Triphala Churna, Amalaki, Haritaki, Vibhitaki, Krishna Jeeraka, Kuberakshi, Sonti, Akarakarabha, Jambeera Swarasa (as shown on label)",
    benefits: [
      "Supports joint comfort",
      "Supports musculoskeletal wellness",
      "Traditionally used for Vata-related discomfort",
      "Supports skeletal muscle wellness"
    ],
    usage: "1–2 pills daily or as directed by a qualified healthcare professional.",
    packSize: "60 Pills",
    mrp: 2999,
    shelfLife: "2 Years",
    safetyNote: "Use only as directed. Consult a qualified healthcare professional for individual conditions.",
    image: "/products/Dr lion Pain pills/Pain_pills.webp",
    transparentImage: "/products/Dr lion Pain pills/Pain_pills.webp"
  },
  {
    id: "moon-light-cream",
    name: "Moon Light Cream",
    category: "Ayurvedic Skin Care Cream",
    composition: "Manjishta Churna (1 gm), Chandana Churna (1 gm), Bahlika Flower / Kumkuma Puvvu (1 gm), Japhal Churna (1 gm), Chandana Oil (2 ml), Bees Wax (4 gms) per 10 gms as shown on label",
    benefits: [
      "Supports healthy-looking skin",
      "Supports even-looking tone",
      "May help improve appearance of dark spots with regular skincare use",
      "Suitable for daily skincare"
    ],
    usage: "Clean the skin and apply a small amount evenly. Use regularly as directed.",
    packSize: "25 gms",
    mrp: 199,
    shelfLife: "3 Years",
    safetyNote: "Ayurvedic cream for external use only",
    image: "/products/Moon-light/Moon cream front view.webp",
    transparentImage: "/products/Moon-light/Moon cream front view.webp"
  }
];
