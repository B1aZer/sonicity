# 🎨 Relic NFT Image Creation Guide

## Overview
You need to create **5 images** for the different rarity tiers of Relic NFTs. Each image should be visually distinct and match the descriptions provided.

---

## 📋 Image Specifications

### Technical Requirements:
- **Resolution**: 512x512px or 1024x1024px (square format)
- **Format**: PNG with transparency
- **Background**: Transparent or dark/neutral background
- **File Size**: Keep under 1MB per image
- **Orientation**: Centered, object facing viewer

### File Locations:
1. `/public/images/relics/common.png`
2. `/public/images/relics/uncommon.png`
3. `/public/images/relics/rare.png`
4. `/public/images/relics/epic.png`
5. `/public/images/relics/legendary.png`

---

## 🏺 Detailed Image Descriptions

### 1️⃣ COMMON RELIC (50% chance)
**File:** `common.png`

**Visual Style:**
```
Object: Weathered stone tablet or clay artifact
Colors: Earthy browns (#8B4513, #A0826D), grays (#808080), dusty beige (#D2B48C)
Lighting: Natural, no glow
Effects: None
Material: Rough stone/clay texture
```

**Description from Metadata:**
> "A weathered stone tablet discovered during your adventure. This simple clay artifact shows signs of age with its cracked surface and basic geometric patterns. Covered in dirt and moss, it bears the marks of countless centuries buried beneath the earth."

**Key Visual Elements:**
- ❌ NO magical effects or glow
- ✅ Cracked, worn surface
- ✅ Simple geometric patterns or basic runes
- ✅ Dirt and moss texture
- ✅ Rough, unpolished appearance
- ✅ Small to medium size (hand-held)

**Mood:** Ancient, historical, basic

---

### 2️⃣ UNCOMMON RELIC (30% chance)
**File:** `uncommon.png`

**Visual Style:**
```
Object: Bronze/copper medallion or amulet
Colors: Oxidized copper green (#2E8B57), bronze (#CD7F32), dark gold (#B8860B)
Lighting: Subtle metallic shine
Effects: Very slight shimmer on raised surfaces
Material: Aged metal with patina
```

**Description from Metadata:**
> "A bronze medallion from a forgotten era, this copper amulet displays intricate carved patterns and symbols. The oxidized green patina speaks to its age, while the detailed engravings reveal the skilled craftsmanship of ancient artisans."

**Key Visual Elements:**
- ✅ Circular or shield-shaped
- ✅ Intricate carved patterns/symbols
- ✅ Copper/bronze patina (green oxidation)
- ✅ Engraved border designs
- ✅ Metal shows wear but intact
- ✅ Very subtle shine (not glowing)

**Mood:** Medieval artifact, crafted quality

---

### 3️⃣ RARE RELIC (15% chance)
**File:** `rare.png`

**Visual Style:**
```
Object: Silver chalice, dagger, or ceremonial item
Colors: Bright silver (#C0C0C0), white-blue shimmer (#E0F7FF), ice blue (#87CEEB)
Lighting: Polished surface with soft glow
Effects: Soft silver glow, subtle magical shimmer (20% opacity)
Material: Polished silver with minimal tarnish
```

**Description from Metadata:**
> "An ornate silver artifact that shimmers with an otherworldly light. This ceremonial relic features complex engravings and small gemstone inlays, showing minimal tarnish despite its age. The elegant curves and mystical aura suggest it once belonged to nobility or mystics."

**Key Visual Elements:**
- ✅ Polished silver surface
- ✅ Complex engravings and filigree
- ✅ Small gemstone inlays (sapphires, aquamarines)
- ✅ Elegant, ceremonial design
- ✅ Soft silver glow/aura (subtle)
- ✅ Shows quality craftsmanship

**Mood:** Noble artifact, mystical but refined

---

### 4️⃣ EPIC RELIC (4% chance)
**File:** `epic.png`

**Visual Style:**
```
Object: Golden crown fragment, royal scepter, or ornate artifact
Colors: Rich gold (#FFD700), royal purple (#800080), amber (#FFBF00), warm orange glow
Lighting: Bright with golden aura
Effects: Glowing golden aura (40-60% opacity), pulsing light, subtle particles
Material: Pure gold with jeweled inlays
```

**Description from Metadata:**
> "A fragment of a golden royal treasure, adorned with precious gems and elaborate decorations. This artifact radiates power with its warm golden aura and pulsing magical light. The immense value and legendary craftsmanship suggest it belonged to kings or heroes of old."

**Key Visual Elements:**
- ✅ Pure gold construction
- ✅ Multiple precious gems (rubies, amber, topaz)
- ✅ Elaborate decorations and jeweled inlays
- ✅ Intricate metalwork
- ✅ Bright golden aura around object
- ✅ Pulsing warm light effect
- ✅ Subtle particle effects (optional)
- ✅ Slightly floating/suspended appearance

**Mood:** Royal treasure, legendary item, heroic

---

### 5️⃣ LEGENDARY RELIC (1% chance)
**File:** `legendary.png`

**Visual Style:**
```
Object: Crystalline artifact, divine weapon fragment, cosmic relic
Colors: Brilliant white-blue (#F0F8FF), rainbow prismatic, purple-blue cosmic (#4B0082), 
        starlight white (#FFFFFF), multi-colored auras
Lighting: Intense radiant glow
Effects: MAXIMUM EFFECTS - prismatic refraction, particles, floating runes, energy streams,
         cosmic patterns, light beams, magical aura
Material: Translucent glowing crystal
```

**Description from Metadata:**
> "A crystalline artifact of immense power, emanating cosmic energy and starlight. This divine relic features a translucent glowing core with floating runes orbiting around it. Rainbow prismatic effects and streams of magical energy mark this as a treasure of the gods themselves - a once-in-a-lifetime discovery."

**Key Visual Elements:**
- ✅ Translucent glowing crystal core
- ✅ Geometric crystalline structure
- ✅ Floating runes orbiting the artifact
- ✅ Energy streams or lightning effects
- ✅ Stars/cosmic patterns within crystal
- ✅ Perfect, flawless construction
- ✅ Floating/rotating (defying physics)
- ✅ Intense radiant glow (80-100% opacity)
- ✅ Rainbow refraction effects
- ✅ Particle streams emanating outward
- ✅ Magical runes floating around it
- ✅ Light beams shooting outward

**Mood:** Divine artifact, cosmic power, ultimate treasure, godlike

---

## 🎨 Visual Progression Chart

```
COMMON → UNCOMMON → RARE → EPIC → LEGENDARY
Stone   → Bronze   → Silver → Gold → Crystal
No Glow → Shine    → Soft   → Bright → Intense
                     Glow     Aura     Radiance
```

### Glow Intensity Scale:
- **Common**: 0% - No glow at all
- **Uncommon**: 10% - Metallic shine only
- **Rare**: 30% - Soft magical shimmer
- **Epic**: 60% - Bright golden aura
- **Legendary**: 100% - Maximum magical effects

---

## 🛠️ Creation Tools & Methods

### Option 1: AI Generation (Recommended for Speed)
**Tools:** Midjourney, DALL-E, Stable Diffusion

**Prompts:**
1. **Common**: "weathered stone tablet artifact, cracked surface, ancient runes, earthy brown and gray, dirt and moss, fantasy game item, no glow, centered, transparent background, 4k"

2. **Uncommon**: "bronze medallion artifact, copper patina, oxidized green, intricate engravings, medieval, slight metallic shine, fantasy game item, centered, transparent background, 4k"

3. **Rare**: "silver ceremonial chalice artifact, gemstone inlays, ornate engravings, soft blue glow, mystical aura, fantasy game item, centered, transparent background, 4k"

4. **Epic**: "golden crown fragment artifact, ruby gems, bright golden aura, pulsing light, royal treasure, fantasy game item, centered, transparent background, 4k"

5. **Legendary**: "crystalline cosmic artifact, translucent glowing crystal, rainbow prismatic effects, floating runes, intense radiance, divine treasure, fantasy game item, centered, transparent background, 4k"

### Option 2: 3D Modeling
**Tools:** Blender, Cinema 4D

### Option 3: Digital Painting
**Tools:** Photoshop, Procreate, Krita

### Option 4: Commission an Artist
**Platforms:** Fiverr, Upwork, ArtStation

---

## ✅ Quality Checklist

Before finalizing each image, verify:

- [ ] Correct resolution (512x512 or 1024x1024)
- [ ] PNG format with transparency
- [ ] Centered composition
- [ ] Matches rarity description
- [ ] Appropriate glow/effects for tier
- [ ] Consistent art style across all 5
- [ ] Clear visual hierarchy (Common < Legendary)
- [ ] File size under 1MB
- [ ] Saved with correct filename

---

## 📊 Rarity Distribution Reminder

When creating, remember how often each will be seen:
- **Common**: 50% of all relics (most common - keep simple)
- **Uncommon**: 30% of relics (fairly common)
- **Rare**: 15% of relics (less common)
- **Epic**: 4% of relics (rare - make impressive!)
- **Legendary**: 1% of relics (extremely rare - MAXIMUM IMPACT!)

---

## 🚀 After Creation

Once all 5 images are created:

1. Save them in `/public/images/relics/` directory:
   ```
   /public/images/relics/
   ├── common.png
   ├── uncommon.png
   ├── rare.png
   ├── epic.png
   └── legendary.png
   ```

2. Run the metadata generation script:
   ```bash
   cd scripts
   node generate-relic-metadata.js
   ```

3. Verify the metadata files reference the correct images:
   ```bash
   ls -la public/metadata/relics/
   ```

---

## 💡 Tips & Best Practices

1. **Maintain Consistency**: All 5 relics should look like they're from the same game/world
2. **Clear Differentiation**: Players should instantly recognize rarity by looking at the image
3. **Test at Small Size**: View images at 64x64px to ensure they're recognizable when small
4. **Consider Colorblind Players**: Use shape/glow intensity, not just color
5. **Save Source Files**: Keep original PSD/Blend files for future edits

---

## 🎯 Example References

**Common Tier**: Think *Skyrim* common loot, *Diablo* white items
**Uncommon Tier**: Think *WoW* green items, basic magic items
**Rare Tier**: Think *WoW* blue items, *Path of Exile* rare items
**Epic Tier**: Think *WoW* purple items, *Diablo* legendary glow
**Legendary Tier**: Think *Destiny* exotics, *WoW* legendary weapons

---

Good luck creating the images! The descriptions are now synced with the metadata generation script, so whatever you create will match the NFT descriptions perfectly. 🎨✨

