# BJJ Reels

Osobná appka na triedenie uložených BJJ reels z Instagramu. Import z oficiálneho exportu, triedenie podľa pozície, typu, gi/no-gi, úrovne a stavu, rýchle triedenie po jednom, filtre a záloha.

**Local-first:** žiadny server, žiadne účty. Dáta sú len v prehliadači (IndexedDB) a appka funguje aj offline. Appka nevolá Instagram API, nič nescrapuje a nesťahuje videá. Pracuje len s odkazmi z tvojho exportu.

## Spustenie na počítači

Potrebuješ [Node.js](https://nodejs.org) 20 alebo novší.

```bash
npm install
```

```bash
npm run dev
```

Otvor <http://localhost:5173>.

V tomto režime appka beží bez service workera, teda bez offline režimu. Plnú PWA si vyskúšaš cez produkčný build:

```bash
npm run build
```

```bash
npm run preview
```

Potom otvor <http://localhost:4173>.

## Import exportu z Instagramu

1. Instagram → Nastavenia → **Centrum účtov** → *Tvoje informácie a povolenia* → **Stiahnuť tvoje informácie**. Vyber formát **JSON** a aspoň kategóriu *Uložené*.
2. Z rozbaleného archívu budeš potrebovať `your_instagram_activity/saved/saved_posts.json` a `saved_collections.json`.
3. V appke otvor **Nastavenia → Import z Instagramu** (pri prázdnej knižnici je import rovno na úvodnej obrazovke) a vyber oba súbory naraz.
4. Označ, ktoré IG kolekcie patria do BJJ. Predvolene sú vybraté kolekcie, ktorých názov obsahuje BJJ, Jiu jitsu alebo Judo.
   - Príspevky bez kolekcie sa rozdelia podľa hashtagov a popisu.
   - Zvyšok pôjde do **Mimo BJJ**. Nezmizne, nájdeš ho cez filter *Knižnica → Mimo BJJ* a môžeš ho vrátiť.

**Opakovaný import** (nový export) pridá len nové reels. Duplicity sa poznajú podľa URL: `/reel/X/?igsh=…` a `/p/X/` sú ten istý reel. Tvoje triedenie sa nikdy neprepíše. Pri existujúcich reeloch sa len doplnia prázdne údaje (autor a popis pri ručne pridaných) a nové IG kolekcie.

## Ako triediť stovky reels za pár dní

1. **Najprv hromadne podľa IG kolekcií.** V Knižnici otvor Filtre → *Kolekcie z Instagramu* → napr. „BJJ - armbar“. Potom **Hromadne** → typ `submission` + tag `armbar` → Použiť. Takto spracuješ všetko, čo už máš roztriedené v Instagrame.
2. **Zvyšok v Triedení.** Ukazuje jeden netriedený reel naraz s veľkými tlačidlami.
   - Každá zmena sa ukladá hneď a tlačidlo **Ďalší** posunie na ďalší reel.
   - Nie-BJJ reel pošli preč tlačidlom **Mimo BJJ** (dá sa vrátiť).
   - Hore si môžeš vybrať len jednu IG kolekciu.
   - Na počítači fungujú šípky ← → a Enter.
   - Pokrok ukazuje biely opasok: každých 25 % vytriedenej knižnice pridá stripe.
3. **Netriedené** = reel nemá pozíciu ani typ. Preskočené reels prídu na rad na konci fronty.

Zoznamy pozícií a typov upravíš v **Nastaveniach**: pridať, premenovať, zmeniť poradie, odstrániť. Premenovanie sa prepíše aj do otriedených reels.

### Hľadanie a filtre

- Fulltext hľadá bez diakritiky v poznámkach, tagoch, popise z Instagramu, hashtagoch, autorovi a IG kolekciách.
- Filtre: stav, pozícia, typ, gi/no-gi, úroveň, tagy, IG kolekcie, autor, obľúbené, netriedené.
  - V rámci jedného poľa platí „alebo“, medzi poľami „a“.
  - Čísla pri filtroch ukazujú, koľko výsledkov bude.
  - Filter „Gi“ aj „No-gi“ zahŕňa reels označené „Obe“.
- Klik na autora na karte zobrazí všetky jeho reels.

## Na mobile

Dáta sú vždy uložené v konkrétnom prehliadači na konkrétnom zariadení. Mobil a počítač sa **nesynchronizujú**, na prenos slúži záloha (pozri nižšie).

### A) Lokálne cez Wi-Fi (bez nasadenia)

Počítač a mobil musia byť v rovnakej sieti.

```bash
npm run build
```

```bash
npm run preview -- --host
```

1. Na počítači zisti IP adresu príkazom `ipconfig` (riadok *IPv4 Address*, napr. `192.168.0.12`).
2. Na mobile otvor `http://192.168.0.12:4173`.
3. Ak sa Windows Firewall opýta, povoľ Node.js pre súkromnú sieť.

Obmedzenie: cez `http://` (nie `https://`) prehliadač nepovolí service worker. Appka teda funguje ako bežná stránka, ale **nedá sa nainštalovať, nefunguje offline a nemá share target**. Do siete ide len hotová appka z `dist/`, nie tvoj export.

### B) Ako statická stránka na GitHub Pages (plná PWA)

Appka je nasadená z GitHub repa cez GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). Každý push do vetvy `main` spustí testy, build a publikovanie na `https://<účet>.github.io/bjj-reels/`.

Prvé nastavenie (raz):

1. Na GitHube vytvor prázdne verejné repo `bjj-reels` (bez README, licencie a .gitignore).
2. V repe: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Pushni kód do `main`. Stav nasadenia uvidíš v záložke **Actions**.

Aktualizácia appky = commit + push. Funguje to aj na inom statickom hostingu s HTTPS (Netlify, Cloudflare Pages): stačí nahrať obsah `dist/` po `npm run build`, appka beží z ľubovoľnej podcesty (`base: './'`).

- Na hosting ide **len kód appky**. Tvoje reels a triedenie ostávajú v zariadení.
- Repo je verejné, ale obsahuje iba zdrojový kód. Export a zálohy blokuje `.gitignore`. Commity používajú GitHub noreply e-mail (lokálne `git config user.email`), takže tvoj e-mail nie je verejný.
- **Android (Chrome):** otvor stránku → ⋮ → *Inštalovať aplikáciu*. Potom v Instagrame pri reeli ťukni na *Zdieľať* → ďalšie možnosti → **BJJ Reels**. Reel sa pridá sám a otvorí sa jeho triedenie (Web Share Target).
- **iPhone (Safari):** Zdieľať → *Pridať na plochu*. iOS nepodporuje zdieľanie do webových appiek. Použi v Instagrame *Kopírovať odkaz* a v appke **Pridať → Vložiť**.

## Záloha a prenos medzi zariadeniami

**Nastavenia → Záloha → Stiahnuť zálohu** uloží všetko (reels, tagy, poznámky, stav, zoznamy pozícií a typov) do súboru `bjj-reels-zaloha-RRRR-MM-DD.json`. Na mobile je aj **Poslať…** (napr. na Disk alebo e-mailom).

**Obnoviť zo zálohy** ponúka dve možnosti:

- **Zlúčiť:** pridá chýbajúce reels, pri rovnakých vyhrá novšia úprava. Toto použi na prenos PC ↔ mobil.
- **Nahradiť všetko:** vráti stav presne podľa zálohy.

Prehliadač môže pri nedostatku miesta zmazať dáta stránok. Appka preto žiada o trvalé úložisko (stav nájdeš v Nastaveniach → Úložisko). Aj tak si občas stiahni zálohu.

## Súkromie

- Export a zálohy obsahujú osobné údaje, preto sú v `.gitignore` (`saved/`, `export/`, `saved_*.json`, `*.zip`, `bjj-reels-zaloha-*.json` …). Nenahrávaj ich na GitHub ani na hosting.
- Import sa spracuje v prehliadači. Súbor sa nikam neposiela.
- Odkaz na Instagram sa otvára v novej karte (`noopener noreferrer`).
- **Náhľad** v Triedení je voliteľný a predvolene vypnutý. Keď ho zapneš, načíta oficiálny Instagram embed (iframe) priamo v appke. Video nestiahne, ale Instagram uvidí, že si reel otvoril, rovnako ako pri bežnom otvorení odkazu.

## Vývoj

```bash
npm test
```

Spustí unit testy: parser exportu, duplicity, import, zálohu a filtre.

```bash
npm run typecheck
```

```bash
npm run icons
```

Vygeneruje ikony appky (PNG a SVG) bez externých nástrojov.

Test na reálnom exporte sa spustí len vtedy, keď mu dáš cestu k priečinku so `saved_posts.json`. Export sa nikam nekopíruje.

```powershell
$env:IG_EXPORT_DIR="C:\cesta\k\saved"; npm test
```

**Stack:** Vite + React + TypeScript, IndexedDB cez [`idb`](https://github.com/jakearchibald/idb), PWA cez `vite-plugin-pwa`, písmo Archivo (je súčasťou appky, takže funguje offline).

- React a TypeScript zvládnu veľa interaktívneho stavu (filtre, čipy, rýchle triedenie) bez ručného prepisovania DOM.
- Typy strážia dátový model pri importe a zálohe.
- Za behu má appka len 3 závislosti.

```
src/
  lib/igExport.ts   parser Instagram exportu (aj oprava kódovania „NÃ¡zov“ → „Názov“)
  lib/merge.ts      zlúčenie s existujúcimi dátami, pravidlo BJJ / Mimo BJJ
  lib/url.ts        normalizácia odkazov (duplicity)
  lib/filters.ts    filtre, fulltext, počty
  lib/backup.ts     export a import zálohy
  lib/db.ts         IndexedDB
  views/            Knižnica, Triedenie, Pridať, Nastavenia
  components/       karta, detail, filtre, hromadná úprava, triediace polia
tests/              vitest (syntetické dáta v rovnakom tvare ako export)
```

## Obmedzenia

- Export neobsahuje náhľady videí, preto karty ukazujú autora a popis.
- Zdieľacie odkazy `instagram.com/share/…` sa nedajú spárovať s exportom. Pri ďalšom importe môže byť taký reel dvakrát. Lepšie je použiť *Kopírovať odkaz*.
- Mobil a počítač sa nesynchronizujú, prenos ide cez zálohu.
