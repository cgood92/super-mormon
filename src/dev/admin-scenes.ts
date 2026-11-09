import {
  STORY_ORDER,
  STORY_TITLES,
  type StoryId,
} from "../game/runtime/progression";

export type AdminScene = {
  id: StoryId | "missionary" | "hub";
  title: string;
  chapter: string;
  group: string;
  description: string;
};

export const ADMIN_GROUPS = [
  "Jerusalem (1 Nephi 1–5)",
  "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
  "Teachings & Missions (Jacob – Mosiah, Alma 17)",
  "The War Chapters (Alma 46–62)",
  "Prophecy & The Savior (Helaman – 3 Nephi)",
  "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
  "Conference Center & Special Worlds",
] as const;

export const ADMIN_SCENES: readonly AdminScene[] = [
  // Group 1: Jerusalem (1 Nephi 1–5)
  {
    id: "streets",
    title: STORY_TITLES.streets,
    chapter: "1 NEPHI 1–2 · ABOUT 600 BC",
    group: "Jerusalem (1 Nephi 1–5)",
    description: "Escape through the city streets and enter the wilderness.",
  },
  {
    id: "palace",
    title: STORY_TITLES.palace,
    chapter: "1 NEPHI 3–4 · ABOUT 600 BC",
    group: "Jerusalem (1 Nephi 1–5)",
    description:
      "Face Laban in the palace courtyard and pursue the plates of brass.",
  },
  {
    id: "house",
    title: STORY_TITLES.house,
    chapter: "1 NEPHI 2–3 · ABOUT 600 BC",
    group: "Jerusalem (1 Nephi 1–5)",
    description:
      "Search Lehi’s house to gather gold, silver, and precious treasures.",
  },
  {
    id: "trade",
    title: STORY_TITLES.trade,
    chapter: "1 NEPHI 3 · ABOUT 600 BC",
    group: "Jerusalem (1 Nephi 1–5)",
    description: "Offer the family’s treasures in trade for the holy records.",
  },
  {
    id: "night",
    title: STORY_TITLES.night,
    chapter: "1 NEPHI 4 · ABOUT 600 BC",
    group: "Jerusalem (1 Nephi 1–5)",
    description:
      "Creep through moonlit streets led by the Spirit to obtain the plates.",
  },

  // Group 2: Wilderness Journey & Ocean Crossing (1 Nephi 8–18)
  {
    id: "tree",
    title: STORY_TITLES.tree,
    chapter: "1 NEPHI 8 · LEHI’S VISION",
    group: "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
    description:
      "Hold fast to the iron rod through mists of darkness to the tree of life.",
  },
  {
    id: "broken-bow",
    title: STORY_TITLES["broken-bow"],
    chapter: "1 NEPHI 16 · THE BROKEN BOW",
    group: "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
    description:
      "Fashion a wooden bow and hunt in the mountain heights to feed the camp.",
  },
  {
    id: "bountiful",
    title: STORY_TITLES.bountiful,
    chapter: "1 NEPHI 17 · BUILDING THE SHIP",
    group: "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
    description:
      "Smelt ore, make tools, fell timbers, and construct a seaworthy ship.",
  },
  {
    id: "voyage",
    title: STORY_TITLES.voyage,
    chapter: "1 NEPHI 18 · THE OCEAN VOYAGE",
    group: "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
    description:
      "Survive the tempest, steer below deck, and consult the Liahona.",
  },
  {
    id: "promised",
    title: STORY_TITLES.promised,
    chapter: "1 NEPHI 18 · 2 NEPHI 1–5",
    group: "Wilderness Journey & Ocean Crossing (1 Nephi 8–18)",
    description:
      "Pitch tents, plant crops, and build a settlement in the promised land.",
  },

  // Group 3: Teachings & Missions (Jacob – Mosiah, Alma 17)
  {
    id: "vineyard",
    title: STORY_TITLES.vineyard,
    chapter: "JACOB 5 · THE OLIVE VINEYARD",
    group: "Teachings & Missions (Jacob – Mosiah, Alma 17)",
    description:
      "Nourish, graft, prune, and tend the olive trees across the vineyard.",
  },
  {
    id: "jacob",
    title: STORY_TITLES.jacob,
    chapter: "JACOB 7 · FAITH IN CHRIST",
    group: "Teachings & Missions (Jacob – Mosiah, Alma 17)",
    description:
      "Stand firm in faith against Sherem and testify of the Redeemer.",
  },
  {
    id: "waters",
    title: STORY_TITLES.waters,
    chapter: "MOSIAH 18 · ABOUT 147–145 BC",
    group: "Teachings & Missions (Jacob – Mosiah, Alma 17)",
    description:
      "Evade King Noah’s patrol spies and join Alma at the pure waters of Mormon.",
  },
  {
    id: "ammon",
    title: STORY_TITLES.ammon,
    chapter: "ALMA 17 · ABOUT 91 BC",
    group: "Teachings & Missions (Jacob – Mosiah, Alma 17)",
    description:
      "Protect the king’s scattered sheep and contend with robbers at Sebus.",
  },

  // Group 4: The War Chapters (Alma 46–62)
  {
    id: "title-liberty",
    title: STORY_TITLES["title-liberty"],
    chapter: "ALMA 46 · THE TITLE OF LIBERTY",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Hoist Captain Moroni’s standard to defend religion, freedom, and peace.",
  },
  {
    id: "lehonti",
    title: STORY_TITLES.lehonti,
    chapter: "ALMA 47 · MOUNT ANTIPAS",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Climb Mount Antipas where Amalickiah schemes to take the army by poison.",
  },
  {
    id: "morianton",
    title: STORY_TITLES.morianton,
    chapter: "ALMA 50 · THE NARROW PASS",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Head off Morianton’s fleeing flight before they reach the narrow pass.",
  },
  {
    id: "teancum",
    title: STORY_TITLES.teancum,
    chapter: "ALMA 51 · A NIGHT MISSION",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Infiltrate the enemy camp under cover of night on a stealth assignment.",
  },
  {
    id: "gid",
    title: STORY_TITLES.gid,
    chapter: "ALMA 55 · THE PRISONERS OF GID",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Deliver wine to guards and arm Nephite prisoners in the dead of night.",
  },
  {
    id: "nephihah",
    title: STORY_TITLES.nephihah,
    chapter: "ALMA 62 · THE WALLS OF NEPHIHAH",
    group: "The War Chapters (Alma 46–62)",
    description:
      "Scale city parapets with ropes and cords to recapture Nephihah.",
  },

  // Group 5: Prophecy & The Savior (Helaman – 3 Nephi)
  {
    id: "samuel",
    title: STORY_TITLES.samuel,
    chapter: "HELAMAN 13–16 · ABOUT 6 BC",
    group: "Prophecy & The Savior (Helaman – 3 Nephi)",
    description:
      "Proclaim repentance atop the walls of Zarahemla shielding from arrows.",
  },
  {
    id: "signs",
    title: STORY_TITLES.signs,
    chapter: "3 NEPHI 1 · THE NIGHT WITHOUT DARKNESS",
    group: "Prophecy & The Savior (Helaman – 3 Nephi)",
    description:
      "Await the miraculous sunset that remains bright as midday at Christ’s birth.",
  },
  {
    id: "gathering",
    title: STORY_TITLES.gathering,
    chapter: "3 NEPHI 3–4 · GATHERING TO SAFETY",
    group: "Prophecy & The Savior (Helaman – 3 Nephi)",
    description:
      "Assemble people and herds to endure the siege of Gadianton robbers.",
  },
  {
    id: "christ-bountiful",
    title: STORY_TITLES["christ-bountiful"],
    chapter: "3 NEPHI 11, 17 · CHRIST AT BOUNTIFUL",
    group: "Prophecy & The Savior (Helaman – 3 Nephi)",
    description:
      "Witness the resurrected Christ descending from heaven at the temple.",
  },

  // Group 6: Peace, Record Keepers & Jaredites (4 Nephi – Moroni)
  {
    id: "peace-city",
    title: STORY_TITLES["peace-city"],
    chapter: "4 NEPHI 1 · A PEOPLE OF PEACE",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Experience two centuries of harmony where all things were shared in common.",
  },
  {
    id: "mormon-records",
    title: STORY_TITLES["mormon-records"],
    chapter: "MORMON 1, 4, 6 · PRESERVING THE RECORDS",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Ammaron commissions young Mormon to safeguard the sacred plates.",
  },
  {
    id: "jared-expedition",
    title: STORY_TITLES["jared-expedition"],
    chapter: "ETHER 1–2 · AN EARLIER PEOPLE",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Lead the expedition northward with flocks, seeds, and Deseret honeybees.",
  },
  {
    id: "jared-barges",
    title: STORY_TITLES["jared-barges"],
    chapter: "ETHER 2 · THE BARGE BUILDERS",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Construct eight watertight vessels tight like dishes for the deep.",
  },
  {
    id: "shelem-stones",
    title: STORY_TITLES["shelem-stones"],
    chapter: "ETHER 3 · THE STONES OF SHELEM",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Carry sixteen clear stones atop Mount Shelem for the Lord to touch.",
  },
  {
    id: "jared-crossing",
    title: STORY_TITLES["jared-crossing"],
    chapter: "ETHER 6 · LIGHT UPON THE WATERS",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Voyage 344 days across the tumultuous sea guided by illuminated stones.",
  },
  {
    id: "ether-refuge",
    title: STORY_TITLES["ether-refuge"],
    chapter: "ETHER 13, 15 · A WITNESS IN HIDING",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Witness the final Jaredite battles from the cavity of a hillside rock.",
  },
  {
    id: "moroni-farewell",
    title: STORY_TITLES["moroni-farewell"],
    chapter: "MORMON 8 · MORONI 1, 10 · FAREWELL",
    group: "Peace, Record Keepers & Jaredites (4 Nephi – Moroni)",
    description:
      "Wander alone, write the closing testimony, and seal the record in Cumorah.",
  },

  // Group 7: Conference Center & Special Worlds
  {
    id: "hub",
    title: "Conference Center (Main Hub)",
    chapter: "MODERN SALT LAKE CITY · HEADQUARTERS",
    group: "Conference Center & Special Worlds",
    description:
      "Explore the gallery paintings, rooftop gardens, and conference organ.",
  },
  {
    id: "missionary",
    title: "Neighborhood Challenge",
    chapter: "A FICTIONAL NEIGHBORHOOD CHALLENGE",
    group: "Conference Center & Special Worlds",
    description:
      "A friendly neighborhood level to explore, jump, and greet neighbors.",
  },
];

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderAdminMenuHtml(base = "/"): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const totalCount = ADMIN_SCENES.length;

  const scenesByGroup = new Map<string, AdminScene[]>();
  for (const group of ADMIN_GROUPS) {
    scenesByGroup.set(group, []);
  }
  for (const scene of ADMIN_SCENES) {
    const list = scenesByGroup.get(scene.group);
    if (list) {
      list.push(scene);
    } else {
      scenesByGroup.set(scene.group, [scene]);
    }
  }

  const sectionsHtml = ADMIN_GROUPS.map((group) => {
    const scenes = scenesByGroup.get(group) || [];
    if (!scenes.length) return "";
    const cardsHtml = scenes
      .map((s) => {
        const isHub = s.id === "hub";
        const targetUrl = isHub
          ? normalizedBase
          : `${normalizedBase}?scene=${encodeURIComponent(s.id)}`;
        const paramLabel = isHub ? "(default hub)" : `?scene=${s.id}`;
        const searchTokens =
          `${s.id} ${s.title} ${s.chapter} ${s.group} ${s.description}`.toLowerCase();

        return `
          <a
            href="${escapeHtml(targetUrl)}"
            class="scene-card"
            data-id="${escapeHtml(s.id)}"
            data-group="${escapeHtml(s.group)}"
            data-search="${escapeHtml(searchTokens)}"
          >
            <div class="card-top">
              <span class="scene-title">${escapeHtml(s.title)}</span>
              <code class="scene-param">${escapeHtml(paramLabel)}</code>
            </div>
            <div class="scene-chapter">${escapeHtml(s.chapter)}</div>
            <p class="scene-desc">${escapeHtml(s.description)}</p>
            <div class="card-footer">
              <span class="launch-label">Jump to level &rarr;</span>
            </div>
          </a>`;
      })
      .join("\n");

    return `
      <section class="scene-group" data-group-name="${escapeHtml(group)}">
        <h2 class="group-title">${escapeHtml(group)}</h2>
        <div class="scenes-grid">
          ${cardsHtml}
        </div>
      </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Super Mormon — Level Selector (Local Dev)</title>
    <style>
      :root {
        --bg-main: #0c120e;
        --bg-surface: #141f18;
        --bg-card: #1a2820;
        --bg-card-hover: #22352b;
        --border-subtle: #24382c;
        --border-hover: #3b5c48;
        --accent-emerald: #10b981;
        --accent-glow: rgba(16, 185, 129, 0.2);
        --accent-gold: #f59e0b;
        --text-primary: #f0fdf4;
        --text-secondary: #94a3b8;
        --text-muted: #64748b;
        --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        background-color: var(--bg-main);
        color: var(--text-primary);
        font-family: var(--font-sans);
        line-height: 1.5;
        padding: 2rem 1.5rem 4rem;
        min-height: 100vh;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
      }

      header {
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .header-top {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: #ffffff;
      }

      .badge-dev {
        background: #27272a;
        color: var(--accent-gold);
        border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .hub-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-surface);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s;
      }

      .hub-btn:hover {
        background: var(--bg-card);
        border-color: var(--border-hover);
        color: var(--accent-emerald);
      }

      .subtitle {
        color: var(--text-secondary);
        font-size: 0.95rem;
        max-width: 800px;
      }

      .toolbar {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(12, 18, 14, 0.92);
        backdrop-filter: blur(8px);
        padding: 1rem 0;
        margin-bottom: 2rem;
        border-bottom: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-input {
        width: 100%;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        color: #ffffff;
        font-size: 1rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }

      .search-input:focus {
        border-color: var(--accent-emerald);
        box-shadow: 0 0 0 3px var(--accent-glow);
      }

      .search-icon {
        position: absolute;
        left: 0.9rem;
        color: var(--text-muted);
        pointer-events: none;
        font-size: 1rem;
      }

      .search-status {
        position: absolute;
        right: 1rem;
        color: var(--text-secondary);
        font-size: 0.8rem;
        pointer-events: none;
      }

      .pills-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }

      .filter-pill {
        background: transparent;
        border: 1px solid var(--border-subtle);
        color: var(--text-secondary);
        padding: 0.35rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.8rem;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
      }

      .filter-pill:hover {
        background: var(--bg-surface);
        color: var(--text-primary);
        border-color: var(--border-hover);
      }

      .filter-pill.active {
        background: var(--accent-emerald);
        color: #062b1b;
        font-weight: 600;
        border-color: var(--accent-emerald);
      }

      .scene-group {
        margin-bottom: 2.5rem;
      }

      .group-title {
        font-size: 1.15rem;
        font-weight: 600;
        color: var(--accent-emerald);
        margin-bottom: 1rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid rgba(16, 185, 129, 0.2);
        letter-spacing: -0.01em;
      }

      .scenes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1rem;
      }

      .scene-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
      }

      .scene-card:hover, .scene-card:focus {
        background: var(--bg-card-hover);
        border-color: var(--accent-emerald);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        outline: none;
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
      }

      .scene-title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #ffffff;
      }

      .scene-param {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: #a7f3d0;
        background: rgba(16, 185, 129, 0.15);
        padding: 0.2rem 0.45rem;
        border-radius: 6px;
        border: 1px solid rgba(16, 185, 129, 0.3);
        white-space: nowrap;
      }

      .scene-chapter {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--accent-gold);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
      }

      .scene-desc {
        font-size: 0.85rem;
        color: var(--text-secondary);
        flex: 1;
        margin-bottom: 1rem;
        line-height: 1.4;
      }

      .card-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--accent-emerald);
      }

      .scene-card:hover .launch-label {
        text-decoration: underline;
      }

      .no-results {
        text-align: center;
        padding: 4rem 1rem;
        color: var(--text-secondary);
      }

      .no-results p {
        margin-bottom: 1rem;
        font-size: 1.1rem;
      }

      .reset-btn {
        background: var(--accent-emerald);
        color: #062b1b;
        border: none;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }

      @media (max-width: 640px) {
        body {
          padding: 1rem 1rem 3rem;
        }
        .scenes-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="header-top">
          <div class="brand">
            <h1>Super Mormon</h1>
            <span class="badge-dev">Local Dev Only</span>
          </div>
          <a href="${escapeHtml(normalizedBase)}" class="hub-btn">
            <span>&larr;</span> Return to Hub
          </a>
        </div>
        <p class="subtitle">
          Jump directly to any level in the game via the <code>?scene=&lt;name&gt;</code> query parameter.
          Test sessions do not overwrite saved game progress.
        </p>
      </header>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input
            type="search"
            id="filter"
            class="search-input"
            placeholder="Search by name, chapter, book, or scene id (e.g., bountiful, moroni, 3 nephi)..."
            autofocus
            autocomplete="off"
            spellcheck="false"
          />
          <span id="search-status" class="search-status">${totalCount} scenes</span>
        </div>
        <div class="pills-bar" id="pills-bar">
          <button class="filter-pill active" data-pill="all">All (${totalCount})</button>
          <button class="filter-pill" data-pill="1 Nephi">1 Nephi</button>
          <button class="filter-pill" data-pill="Jacob">Jacob &amp; Mosiah</button>
          <button class="filter-pill" data-pill="War">War Chapters</button>
          <button class="filter-pill" data-pill="3 Nephi">3 Nephi</button>
          <button class="filter-pill" data-pill="Ether">Ether &amp; Moroni</button>
          <button class="filter-pill" data-pill="Special">Hub &amp; Side</button>
        </div>
      </div>

      <main id="scene-groups">
        ${sectionsHtml}
      </main>

      <div id="no-results" class="no-results" style="display: none;">
        <p>No scenes found matching your query.</p>
        <button id="reset-btn" class="reset-btn">Reset Filters</button>
      </div>
    </div>

    <script>
      (function() {
        const filterInput = document.getElementById("filter");
        const statusSpan = document.getElementById("search-status");
        const cards = Array.from(document.querySelectorAll(".scene-card"));
        const groups = Array.from(document.querySelectorAll(".scene-group"));
        const noResults = document.getElementById("no-results");
        const resetBtn = document.getElementById("reset-btn");
        const pills = Array.from(document.querySelectorAll(".filter-pill"));

        let activePill = "all";

        function updateFilter() {
          const query = (filterInput.value || "").trim().toLowerCase();
          let visibleCount = 0;

          groups.forEach((groupEl) => {
            const groupCards = Array.from(groupEl.querySelectorAll(".scene-card"));
            let groupVisible = 0;

            groupCards.forEach((card) => {
              const searchTokens = card.getAttribute("data-search") || "";
              const groupName = card.getAttribute("data-group") || "";
              const matchesQuery = !query || searchTokens.includes(query);

              let matchesPill = true;
              if (activePill === "1 Nephi") {
                matchesPill = groupName.includes("1 Nephi");
              } else if (activePill === "Jacob") {
                matchesPill = groupName.includes("Jacob");
              } else if (activePill === "War") {
                matchesPill = groupName.includes("War");
              } else if (activePill === "3 Nephi") {
                matchesPill = groupName.includes("3 Nephi");
              } else if (activePill === "Ether") {
                matchesPill = groupName.includes("Ether");
              } else if (activePill === "Special") {
                matchesPill = groupName.includes("Special");
              }

              const visible = matchesQuery && matchesPill;
              card.style.display = visible ? "" : "none";
              if (visible) {
                groupVisible++;
                visibleCount++;
              }
            });

            groupEl.style.display = groupVisible > 0 ? "" : "none";
          });

          statusSpan.textContent = visibleCount === ${totalCount}
            ? "${totalCount} scenes"
            : visibleCount + " of ${totalCount} scenes";

          noResults.style.display = visibleCount === 0 ? "block" : "none";
        }

        filterInput.addEventListener("input", updateFilter);

        filterInput.addEventListener("keydown", function(e) {
          if (e.key === "Enter") {
            const firstVisible = cards.find((c) => c.style.display !== "none");
            if (firstVisible) {
              e.preventDefault();
              firstVisible.click();
            }
          } else if (e.key === "Escape") {
            filterInput.value = "";
            activePill = "all";
            pills.forEach((p) => p.classList.toggle("active", p.getAttribute("data-pill") === "all"));
            updateFilter();
          }
        });

        pills.forEach((pill) => {
          pill.addEventListener("click", () => {
            pills.forEach((p) => p.classList.remove("active"));
            pill.classList.add("active");
            activePill = pill.getAttribute("data-pill") || "all";
            updateFilter();
          });
        });

        if (resetBtn) {
          resetBtn.addEventListener("click", () => {
            filterInput.value = "";
            activePill = "all";
            pills.forEach((p) => p.classList.toggle("active", p.getAttribute("data-pill") === "all"));
            updateFilter();
            filterInput.focus();
          });
        }
      })();
    </script>
  </body>
</html>`;
}
