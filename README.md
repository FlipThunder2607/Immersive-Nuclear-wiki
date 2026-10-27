# Immersive Nuclear wiki

Wiki of [Immersive Nuclear](https://github.com/FlipThunder2607/Immersive-Nuclear), an Immersive Engineering addon for
Minecraft 1.12.2 about the nuclear fuel cycle, from uranium ore to the reactor.

**Read it here:** https://flipthunder2607.github.io/Immersive-Nuclear-wiki/

Available in **Portuguese (PT-BR) and English**: switch with the button at the top right. Your choice is remembered;
the first visit follows your browser's language.

## What is in it

- **In production:** the uranium purification line, which is playable now. It takes IE's uranium powder to
  yellowcake through the Chemical Processing Unit, the Filtration Unit, the Chemical Separation Unit, the Precipitation
  Unit and the Industrial Dryer. The Metal Extractor is a side branch that recovers metals from the effluent. It also
  covers the line's supplies and reagents, its by-products and how each one is treated or recycled.
- **Next stages:** what is planned after it. These are enrichment, fuel fabrication (pellets, rods and assemblies), the
  reactor, power generation (exchangers, condensers, turbines and alternators), and spent fuel and waste.
- **Systems:** control and automation (the mod's own computers, data network, panels and chips, and automation without
  a computer), and radiation and safety, with the hazards of each material and how to protect against them.
- **Reference:** a searchable catalog of every item and fluid, and the credits.

## How it works

- **Flow chart:** every topic has an interactive one. Drag to explore, click a node to see its recipe and how it works,
  and follow the arrows for supplies, by-products and what gets recycled.
- **Machine pages:** each machine has a page with a **3D model you can rotate**, its structure, its batch, its time
  and energy, and what goes in and comes out.
- **Progress bar:** shows how much of each topic is already in the game. The status of every step is "in game",
  "defined" or "planned".
- **Values:** amounts, times and energy are the mod's current ones. They are provisional until the balancing pass.

It is a static site: open `index.html` in a browser, no server or build step needed.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page shell |
| `paginas.js` | The pages and their Portuguese text |
| `en.js` | The English text: interface, pages and every node |
| `wiki.js` | Routes, menu, flow charts, machine pages, catalog |
| `wiki.css` | The look |
| `recursos/` | The flow chart's data, the 3D models, icons and fluid textures, copied from the mod's design files |

## Credits

Immersive Nuclear is an addon for [Immersive Engineering](https://github.com/BluSunrize/ImmersiveEngineering) by
BluSunrize and Damien A.W. Hazard. The 3D models and icons use Immersive Engineering's textures, which stay under its
own license; see the wiki's credits page.
