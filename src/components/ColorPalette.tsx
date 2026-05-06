"use client";

interface ColorSwatch {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
  category: string;
}

const colors: ColorSwatch[] = [
  // Primary Brand
  {
    name: "Primary Orange",
    hex: "#ea580c",
    rgb: "rgb(234, 88, 12)",
    usage: "Main brand color, buttons, hero background",
    category: "Primary Brand",
  },
  {
    name: "Primary Light",
    hex: "#fb923c",
    rgb: "rgb(251, 146, 60)",
    usage: "Lighter orange variant, hover states",
    category: "Primary Brand",
  },
  {
    name: "Primary Dark",
    hex: "#c2410c",
    rgb: "rgb(194, 65, 12)",
    usage: "Darker orange for hover states, accents",
    category: "Primary Brand",
  },
  {
    name: "Primary Darker",
    hex: "#9a3412",
    rgb: "rgb(154, 52, 18)",
    usage: "Deepest orange-brown variant",
    category: "Primary Brand",
  },
  {
    name: "Secondary Teal",
    hex: "#14b8a6",
    rgb: "rgb(20, 184, 166)",
    usage: "Secondary accents, positive badges",
    category: "Primary Brand",
  },

  // Text Colors
  {
    name: "Foreground (Dark Brown)",
    hex: "#431407",
    rgb: "rgb(67, 20, 7)",
    usage: "Primary text, headings",
    category: "Text",
  },
  {
    name: "Text Body",
    hex: "#404040",
    rgb: "rgb(64, 64, 64)",
    usage: "Body text, descriptions",
    category: "Text",
  },
  {
    name: "Text Muted",
    hex: "#888888",
    rgb: "rgb(136, 136, 136)",
    usage: "Disabled text, helper text",
    category: "Text",
  },
  {
    name: "Text Light",
    hex: "#aaaaaa",
    rgb: "rgb(170, 170, 170)",
    usage: "Placeholder text, hints",
    category: "Text",
  },

  // Backgrounds & Neutral
  {
    name: "White",
    hex: "#ffffff",
    rgb: "rgb(255, 255, 255)",
    usage: "Cards, overlays",
    category: "Neutral",
  },
  {
    name: "Background (Warm White)",
    hex: "#fffbf5",
    rgb: "rgb(255, 251, 245)",
    usage: "Main page background",
    category: "Neutral",
  },
  {
    name: "Background Alt",
    hex: "#fff7ed",
    rgb: "rgb(255, 247, 237)",
    usage: "Alternate sections, light backgrounds",
    category: "Neutral",
  },
  {
    name: "Border",
    hex: "#fed7aa",
    rgb: "rgb(254, 215, 170)",
    usage: "Borders, dividers (light orange)",
    category: "Neutral",
  },

  // Utility & Badge Colors
  {
    name: "Sale Red",
    hex: "#dc2626",
    rgb: "rgb(220, 38, 38)",
    usage: "Sale/discount badges, alerts",
    category: "Utility",
  },
  {
    name: "Badge Green (Teal)",
    hex: "#14b8a6",
    rgb: "rgb(20, 184, 166)",
    usage: "Positive/status badges",
    category: "Utility",
  },

  // Social Media
  {
    name: "Facebook",
    hex: "#3b5998",
    rgb: "rgb(59, 89, 152)",
    usage: "Facebook links, social login",
    category: "Social Media",
  },
  {
    name: "Instagram",
    hex: "#8a3ab9",
    rgb: "rgb(138, 58, 185)",
    usage: "Instagram links, sharing",
    category: "Social Media",
  },
  {
    name: "YouTube",
    hex: "#cd201f",
    rgb: "rgb(205, 32, 31)",
    usage: "YouTube links, videos",
    category: "Social Media",
  },
  {
    name: "WhatsApp",
    hex: "#25d366",
    rgb: "rgb(37, 211, 102)",
    usage: "WhatsApp contact links",
    category: "Social Media",
  },
];

function ColorSwatchGrid() {
  const categories = ["Primary Brand", "Text", "Neutral", "Utility", "Social Media"];

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-2">Akhiyan Color Palette</h1>
        <p className="text-text-body">Warm orange and brown palette from akhiyanbd.com — cozy and vibrant for kids fashion</p>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">{category}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colors
              .filter((c) => c.category === category)
              .map((color) => (
                <div
                  key={color.hex}
                  className="bg-white rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Color Swatch */}
                  <div
                    className="h-32 w-full transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                  />

                  {/* Color Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2">{color.name}</h3>

                    {/* Hex Code */}
                    <div className="mb-2">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                        Hex
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-foreground bg-background-alt px-2 py-1 rounded flex-1">
                          {color.hex}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(color.hex);
                          }}
                          className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          title="Copy hex code"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* RGB Code */}
                    <div className="mb-3">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                        RGB
                      </p>
                      <code className="text-xs font-mono text-foreground bg-background-alt px-2 py-1 rounded block">
                        {color.rgb}
                      </code>
                    </div>

                    {/* Usage */}
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                        Usage
                      </p>
                      <p className="text-sm text-text-body">{color.usage}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Color Combinations */}
      <div className="mt-12 bg-background-alt rounded-lg p-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Recommended Combinations</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Button */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Primary Button</h3>
            <div style={{ backgroundColor: "#ea580c" }} className="p-4 rounded border border-border">
              <p style={{ color: "#ffffff" }} className="text-lg font-semibold">
                #ea580c background
              </p>
              <p style={{ color: "#ffffff" }} className="text-sm opacity-90">
                White text on primary
              </p>
            </div>
          </div>

          {/* Secondary Button */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Secondary Button</h3>
            <div style={{ backgroundColor: "#14b8a6" }} className="p-4 rounded border border-border">
              <p style={{ color: "#ffffff" }} className="text-lg font-semibold">
                #14b8a6 background
              </p>
              <p style={{ color: "#ffffff" }} className="text-sm opacity-90">
                White text on secondary
              </p>
            </div>
          </div>

          {/* Dark Text on Warm Background */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Dark Text on Warm Background</h3>
            <div style={{ backgroundColor: "#fffbf5" }} className="p-4 rounded border border-border">
              <p style={{ color: "#431407" }} className="text-lg font-semibold mb-2">
                #431407 - Headings
              </p>
              <p style={{ color: "#404040" }} className="text-sm">
                #404040 - Body text
              </p>
            </div>
          </div>

          {/* Hover States */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Hover States</h3>
            <div className="space-y-2">
              <div style={{ backgroundColor: "#ea580c" }} className="p-3 rounded text-white text-sm font-medium">
                Primary: #ea580c
              </div>
              <div style={{ backgroundColor: "#c2410c" }} className="p-3 rounded text-white text-sm font-medium">
                Primary Hover: #c2410c
              </div>
            </div>
          </div>

          {/* Social Stack */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Social Media Icons</h3>
            <div className="flex gap-3">
              <div
                className="w-12 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "#3b5998" }}
                title="Facebook"
              >
                f
              </div>
              <div
                className="w-12 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "#8a3ab9" }}
                title="Instagram"
              >
                📷
              </div>
              <div
                className="w-12 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "#cd201f" }}
                title="YouTube"
              >
                ▶
              </div>
              <div
                className="w-12 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "#25d366" }}
                title="WhatsApp"
              >
                💬
              </div>
            </div>
          </div>

          {/* Card Example */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Card Example</h3>
            <div className="bg-white border border-border rounded-lg p-4">
              <p style={{ color: "#431407" }} className="font-semibold mb-2">
                Card Title
              </p>
              <p style={{ color: "#404040" }} className="text-sm mb-3">
                Card description goes here
              </p>
              <p style={{ color: "#888888" }} className="text-xs">
                Secondary info
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Info */}
      <div className="mt-12 bg-white rounded-lg border border-border p-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Accessibility</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-foreground">#431407 + #ffffff</p>
              <p className="text-sm text-text-body">AAA contrast ratio - Excellent for all text</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-foreground">#404040 + #ffffff</p>
              <p className="text-sm text-text-body">AAA contrast ratio - Excellent for body text</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-foreground">#ea580c + #ffffff</p>
              <p className="text-sm text-text-body">AA contrast ratio - Good for large text/UI</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-foreground">#14b8a6 + #ffffff</p>
              <p className="text-sm text-text-body">AA contrast ratio - Good for secondary accents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ColorPalettePage() {
  return (
    <div className="min-h-screen bg-white">
      <ColorSwatchGrid />
    </div>
  );
}
