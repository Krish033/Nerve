export const themes = [
  // Dark Themes - High contrast with pure/neutral foregrounds
  { 
    name: 'Cyberpunk Neon', 
    description: 'A high-contrast, neon-infused theme for the ultimate hacker experience.', 
    type: 'THEME', 
    config: { 
      fontFamily: "'Fira Code', monospace", 
      colors: { 
        background: "oklch(0.1 0.02 300)", 
        foreground: "oklch(0.95 0 0)", 
        primary: "oklch(0.7 0.25 320)", 
        card: "oklch(0.13 0.02 300)", 
        border: "oklch(0.25 0.05 300)" 
      }, 
      style: { scanlines: true, glassmorphism: false, radius: "0px" }, 
      loadingIndicator: 'scan' 
    }, 
    author: 'DurbySystem', 
    price: 0 
  },
  { 
    name: 'Deep Space', 
    description: 'Pitch black with subtle starlight accents for night owls.', 
    type: 'THEME', 
    config: { 
      fontFamily: "'Roboto Mono', monospace", 
      colors: { 
        background: "oklch(0.05 0 0)", 
        foreground: "oklch(0.95 0 0)", 
        primary: "oklch(0.7 0.2 220)", 
        card: "oklch(0.08 0 0)", 
        border: "oklch(0.15 0 0)" 
      }, 
      style: { scanlines: false, glassmorphism: true, radius: "8px" }, 
      loadingIndicator: 'pulse' 
    }, 
    author: 'DurbySystem', 
    price: 0 
  },
  { 
    name: 'Sunset Boulevard',
    description: 'Warm gradients of orange and pink, capturing the magic of golden hour.',
    type: 'THEME',
    config: {
      fontFamily: "'Outfit', sans-serif",
      colors: {
        background: "oklch(0.18 0.05 45)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.75 0.2 35)",
        card: "oklch(0.22 0.04 40)",
        border: "oklch(0.32 0.06 42)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "16px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Forest Mist',
    description: 'Serene greens inspired by morning walks through mossy woodlands.',
    type: 'THEME',
    config: {
      fontFamily: "'Cabin', sans-serif",
      colors: {
        background: "oklch(0.15 0.03 145)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.7 0.15 135)",
        card: "oklch(0.2 0.04 142)",
        border: "oklch(0.28 0.05 140)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "12px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Ocean Breeze',
    description: 'Calming blues and teals that evoke tropical waters and clear skies.',
    type: 'THEME',
    config: {
      fontFamily: "'Quicksand', sans-serif",
      colors: {
        background: "oklch(0.2 0.05 220)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.75 0.15 195)",
        card: "oklch(0.25 0.04 225)",
        border: "oklch(0.35 0.07 215)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "20px" },
      loadingIndicator: 'bar'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Berry Bliss',
    description: 'Rich purples and magenta tones inspired by fresh summer berries.',
    type: 'THEME',
    config: {
      fontFamily: "'Nunito', sans-serif",
      colors: {
        background: "oklch(0.12 0.05 320)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.75 0.2 340)",
        card: "oklch(0.18 0.04 315)",
        border: "oklch(0.28 0.07 330)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "14px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Golden Hour',
    description: 'Radiant amber and gold tones that warm up any workspace.',
    type: 'THEME',
    config: {
      fontFamily: "'Playfair Display', serif",
      colors: {
        background: "oklch(0.16 0.04 75)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.78 0.18 85)",
        card: "oklch(0.22 0.03 78)",
        border: "oklch(0.32 0.05 82)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "8px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Midnight Purple',
    description: 'Deep, mysterious purples for those who prefer the dark side.',
    type: 'THEME',
    config: {
      fontFamily: "'JetBrains Mono', monospace",
      colors: {
        background: "oklch(0.08 0.03 290)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.7 0.2 280)",
        card: "oklch(0.12 0.02 295)",
        border: "oklch(0.2 0.04 285)"
      },
      style: { scanlines: true, glassmorphism: true, radius: "6px" },
      loadingIndicator: 'scan'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Coffee Shop',
    description: 'Warm browns and creamy tones perfect for cozy coding sessions.',
    type: 'THEME',
    config: {
      fontFamily: "'Merriweather', serif",
      colors: {
        background: "oklch(0.2 0.03 60)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.65 0.1 45)",
        card: "oklch(0.25 0.02 58)",
        border: "oklch(0.35 0.04 52)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "10px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Mint Chocolate',
    description: 'Fresh mint greens paired with rich chocolate browns.',
    type: 'THEME',
    config: {
      fontFamily: "'Work Sans', sans-serif",
      colors: {
        background: "oklch(0.18 0.04 165)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.6 0.12 50)",
        card: "oklch(0.24 0.03 162)",
        border: "oklch(0.32 0.05 155)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "16px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Coral Reef',
    description: 'Vibrant corals and tropical teals inspired by underwater paradises.',
    type: 'THEME',
    config: {
      fontFamily: "'Rubik', sans-serif",
      colors: {
        background: "oklch(0.22 0.05 25)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.75 0.18 25)",
        card: "oklch(0.28 0.04 28)",
        border: "oklch(0.38 0.07 20)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "18px" },
      loadingIndicator: 'bar'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Slate Professional',
    description: 'Clean slate grays with subtle blue accents for a modern office look.',
    type: 'THEME',
    config: {
      fontFamily: "'Open Sans', sans-serif",
      colors: {
        background: "oklch(0.25 0.02 260)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.65 0.06 255)",
        card: "oklch(0.3 0.01 262)",
        border: "oklch(0.4 0.01 258)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "6px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Tangerine Dream',
    description: 'Bold, energetic oranges for a vibrant and creative workspace.',
    type: 'THEME',
    config: {
      fontFamily: "'Montserrat', sans-serif",
      colors: {
        background: "oklch(0.15 0.06 55)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.78 0.2 50)",
        card: "oklch(0.22 0.04 58)",
        border: "oklch(0.32 0.07 52)"
      },
      style: { scanlines: true, glassmorphism: false, radius: "12px" },
      loadingIndicator: 'scan'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Evergreen',
    description: 'Rich forest greens for nature lovers and outdoor enthusiasts.',
    type: 'THEME',
    config: {
      fontFamily: "'Oxygen', sans-serif",
      colors: {
        background: "oklch(0.12 0.03 155)",
        foreground: "oklch(0.96 0 0)",
        primary: "oklch(0.6 0.14 145)",
        card: "oklch(0.18 0.02 152)",
        border: "oklch(0.26 0.04 148)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "8px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Twilight Dusk',
    description: 'Purple and orange gradients capturing the beauty of evening skies.',
    type: 'THEME',
    config: {
      fontFamily: "'Source Sans Pro', sans-serif",
      colors: {
        background: "oklch(0.14 0.05 280)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.75 0.16 45)",
        card: "oklch(0.2 0.04 285)",
        border: "oklch(0.3 0.06 275)"
      },
      style: { scanlines: true, glassmorphism: true, radius: "10px" },
      loadingIndicator: 'bar'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Obsidian',
    description: 'Sleek dark grays with subtle highlights for a refined, modern look.',
    type: 'THEME',
    config: {
      fontFamily: "'Fira Sans', sans-serif",
      colors: {
        background: "oklch(0.1 0 0)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.7 0.04 260)",
        card: "oklch(0.14 0 0)",
        border: "oklch(0.22 0.01 0)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "8px" },
      loadingIndicator: 'spinner'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Neon Nights',
    description: 'Electric neons on dark backgrounds for a retro-futuristic vibe.',
    type: 'THEME',
    config: {
      fontFamily: "'Inconsolata', monospace",
      colors: {
        background: "oklch(0.08 0.04 280)",
        foreground: "oklch(0.95 0 0)",
        primary: "oklch(0.8 0.25 140)",
        card: "oklch(0.12 0.03 285)",
        border: "oklch(0.25 0.06 130)"
      },
      style: { scanlines: true, glassmorphism: false, radius: "4px" },
      loadingIndicator: 'scan'
    },
    author: 'DurbySystem',
    price: 0
  },
  // Light Themes - Dark foregrounds for readability
  { 
    name: 'Minimalist Light', 
    description: 'Clean, bright, and distraction-free workspace.', 
    type: 'THEME', 
    config: { 
      fontFamily: "'Inter', sans-serif", 
      colors: { 
        background: "oklch(0.98 0 0)", 
        foreground: "oklch(0.15 0 0)", 
        primary: "oklch(0.4 0.1 260)", 
        card: "oklch(1 0 0)", 
        border: "oklch(0.88 0 0)" 
      }, 
      style: { scanlines: false, glassmorphism: false, radius: "12px" }, 
      loadingIndicator: 'spinner' 
    }, 
    author: 'DurbySystem', 
    price: 0 
  },
  {
    name: 'Cherry Blossom',
    description: 'Delicate pinks and soft whites reminiscent of spring sakura petals.',
    type: 'THEME',
    config: {
      fontFamily: "'Karla', sans-serif",
      colors: {
        background: "oklch(0.96 0.02 340)",
        foreground: "oklch(0.2 0 0)",
        primary: "oklch(0.55 0.15 10)",
        card: "oklch(0.98 0.01 345)",
        border: "oklch(0.9 0.02 355)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "24px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Arctic Frost',
    description: 'Icy blues and crisp whites inspired by polar landscapes.',
    type: 'THEME',
    config: {
      fontFamily: "'Roboto', sans-serif",
      colors: {
        background: "oklch(0.96 0.02 240)",
        foreground: "oklch(0.18 0 0)",
        primary: "oklch(0.5 0.12 210)",
        card: "oklch(1 0.01 250)",
        border: "oklch(0.88 0.02 235)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "12px" },
      loadingIndicator: 'bar'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Lavender Fields',
    description: 'Soft purples and gentle lavenders for a calming, peaceful vibe.',
    type: 'THEME',
    config: {
      fontFamily: "'Lato', sans-serif",
      colors: {
        background: "oklch(0.94 0.03 300)",
        foreground: "oklch(0.2 0 0)",
        primary: "oklch(0.5 0.14 290)",
        card: "oklch(0.98 0.02 305)",
        border: "oklch(0.85 0.03 298)"
      },
      style: { scanlines: false, glassmorphism: false, radius: "14px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Rose Gold',
    description: 'Elegant rose gold and blush pink with metallic accents.',
    type: 'THEME',
    config: {
      fontFamily: "'Raleway', sans-serif",
      colors: {
        background: "oklch(0.94 0.03 15)",
        foreground: "oklch(0.2 0 0)",
        primary: "oklch(0.6 0.12 25)",
        card: "oklch(0.98 0.02 18)",
        border: "oklch(0.88 0.03 22)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "20px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  },
  {
    name: 'Marshmallow',
    description: 'Soft pastels and fluffy whites for a sweet, gentle interface.',
    type: 'THEME',
    config: {
      fontFamily: "'Nunito Sans', sans-serif",
      colors: {
        background: "oklch(0.97 0.02 330)",
        foreground: "oklch(0.25 0 0)",
        primary: "oklch(0.65 0.1 350)",
        card: "oklch(1 0.01 325)",
        border: "oklch(0.92 0.02 340)"
      },
      style: { scanlines: false, glassmorphism: true, radius: "24px" },
      loadingIndicator: 'pulse'
    },
    author: 'DurbySystem',
    price: 0
  }
];
