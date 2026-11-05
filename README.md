# Edzésnapló

Telefonra telepíthető edzésnapló (PWA). Egyetlen HTML-fájl, szerver és fiók nélkül fut: <https://dacimerollin.github.io/edzesnaplo/>

## Mi működik Claude nélkül?

Minden, ami a mindennapi használathoz kell:

| Mit szeretnél | Hol |
|---|---|
| Edzés naplózása, súly-/ismétlésjavaslat, kardió-progresszió | Edzés fül |
| **Gyári program módosítása** (F/A, A/B, PPL, U/L, Cali, Min) | Program fül → *„… szerkesztése”* |
| Teljesen új program | Program fül → *+ Új program* / *Másolat* |
| Program generálása AI-val | Program fül → *✨ Program AI-val* → *Prompt másolása* → bármelyik AI-chat → válasz vissza |
| Program mentése fájlba / visszatöltése | Program fül → *Jelenlegi program exportálása* / *Program importálása* |
| Biztonsági mentés (minden adat) | Program fül → Adatok → *Biztonsági mentés* (iCloud Drive / Fájlok) |
| Excel-export | Program fül → Adatok → *CSV (Excel)* |

### Gyári program szerkesztése

A módosított változat **ugyanazon a kulcson és ugyanazokkal a gyakorlat-azonosítókkal** fut, mint a gyári. Ezért az előzmények, a súlyjavaslat és a blokk-pozíció folytatódik. Ha csak pontosítod egy gyakorlat nevét, az előzménye megmarad. Teljesen más gyakorlatnál töröld a régit, és vegyél fel újat, mert az új tiszta lappal indul. Az *Eredeti* gomb visszaállítja a gyári változatot, az edzések ilyenkor is megmaradnak.

### Gyakorlat-típusok

A szerkesztőben a gyakorlat *Típus* mezője dönti el, melyik javaslat-logika fut:

| Típus | Kód | Javaslat |
|---|---|---|
| Súlyzós / gépes | `w` | RIR-korrigált e1RM + kettős progresszió |
| Testsúlyos, mellénnyel nehezíthető | `bwp` | ismétlés ↑, a tartomány tetején mellény / következő lépcső |
| Testsúlyos + súlyöv | `bww` | kettős progresszió plusz súllyal |
| Testsúlyos, variáció-létra | `bw` | ismétlés ↑, a tetején az *alternatíva* mezőben megadott nehezebb variáció |
| Asszisztált gép | `assist` | a súly = segítség, a kevesebb a jobb |
| Tartás | `sec` | +2–3 mp |
| Kardió | `cardio` | +1 perc, 25 perc után +5 W, pulzus- és RPE-feltétellel |
| Pipa | `check` | nincs javaslat (bemelegítés, mobilitás) |

## Adatok

Minden adat csak a telefonon van: `localStorage`, kulcs `edzesnaplo.v1`. **Ha törlöd az app ikonját, az adatok is törlődnek.** 7 nap mentés nélkül a kezdőlapon figyelmeztetés jelenik meg. A mentés JSON; a *Visszatöltés* összefésüli, nem írja felül a meglévőt.

## Kódváltoztatás (ha mégis kell)

1. `index.html` szerkesztése. Mehet a GitHub weboldalán (ceruza ikon) vagy bármelyik szerkesztővel / AI-val.
2. `sw.js` → a `CACHE` sor átírása bármilyen új névre. Így az iPhone-on megjelenik az **„Új verzió”** gomb.
3. Commit a `main` ágra. A GitHub Pages 1–2 perc alatt frissül.

### A kód felépítése (`index.html`)

- `BUILTIN` – a gyári programok. Gyakorlat-tuple: `[id, név, szett, ismétlés, RIR, pihenő mp, alternatíva, végrehajtás, {jelzők}]`. Jelzők: `bw`, `plus`, `weighted`, `assist`, `unit:'sec'|'cardio'|'check'|'cm'`, `lastFail`, `xs` (csúcshéten +szett), `lab` (kijelzett jel), `ss` (szuperszett-pár).
- **Ne változtass meg meglévő `id`-t**: az előzmények és a súlyjavaslat ehhez kötődik.
- `S.programs` – a felhasználó programjai vázlat-formában. `base: 'FA'` = a gyári F/A módosított változata (`buildOverride`), egyébként saját program (`buildProgram`). Mindkettő az `exObj`-on át lesz futó gyakorlat.
- `recommendBase` → `coreGym` / `recCali` / `recAssist` / `recSec` / `recCardio` – a javaslatok.
- `doBackup` / `doRestore` / `exportCsv` / `exportProgram` / `importProgramText` – fájlműveletek.
- `aiPrompt` – az AI-nak szóló prompt és a várt JSON-formátum.

### Program-JSON (export / import / AI)

```json
{"title":"…","label":"F/A","perWeek":4,"phases":["intro","normal","peak","peak","deload"],
 "days":[{"key":"F1","name":"Felső 1","sub":"…","col":"blue","ex":[
   {"id":"F1.2","name":"Dip","type":"bww","sets":4,"reps":"5–8","rir":"1–2","rest":120,
    "ssNext":false,"lastFail":false,"xs":0,"alt":"…","tip":"…"}]}]}
```

A `phases` értékei: `intro`, `normal`, `peak`, `deload`. Ha a `base` mező egy gyári program kulcsa (`FA`, `AB`, `PPL`, `UL`, `CAL`, `MIN`), az import a gyári program változataként nyílik meg.
