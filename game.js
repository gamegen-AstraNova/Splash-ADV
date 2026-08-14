(() => {
  "use strict";

  const SIZE = 11;
  const PLAYER_MOVE_MS = 140;
  const ENEMY_MOVE_MS = Math.round(PLAYER_MOVE_MS / 0.4);
  const TURTLE_MOVE_MS = Math.round(PLAYER_MOVE_MS / 1.2);
  const BOMB_FUSE_MS = 1800;
  const BLAST_MS = 520;
  const TRAP_MS = 2000;
  const RESPAWN_SHIELD_MS = 2000;
  const SHIELD_MS = 3000;
  const CHASE_DISTANCE = 4.25;
  const BACKGROUND_MUSIC_PATH = "./assets/audio/splash-adv-pirate-bgm.mp3";
  const BOSS_MUSIC_PATH = "./assets/audio/splash-adv-boss-bgm.mp3";
  const BUBBLE_TRAP_SOUND_PATH = "./assets/audio/bubble-trap-sfx.mp3";
  const BUBBLE_POP_SOUND_PATH = "./assets/audio/bubble-pop-sfx.mp3";
  const WATER_BALL_EXPLOSION_SOUND_PATH =
    "./assets/audio/water-ball-explosion-sfx.mp3";
  const RESCUE_NEEDLE_SOUND_PATH = "./assets/audio/rescue-needle-sfx.mp3";
  const CRYSTAL_SHIELD_SOUND_PATH =
    "./assets/audio/crystal-shield-activation-sfx.mp3";
  const SPEED_TURTLE_SOUND_PATH =
    "./assets/audio/speed-turtle-activation-sfx.mp3";
  const ITEM_PICKUP_SOUND_PATH = "./assets/audio/item-pickup-sfx.mp3";
  const UI_FEEDBACK_SOUND_PATH = "./assets/audio/ui-feedback-sfx.mp3";
  const STAGE_VICTORY_FANFARE_SOUND_PATH =
    "./assets/audio/stage-victory-fanfare-sfx.mp3";
  const CG_SHUTTER_SOUND_PATH = "./assets/audio/camera-shutter-sfx.mp3";
  const CG_FLASH_REVEAL_MS = 220;
  const CG_FLASH_END_MS = 560;
  const CHEAT_SEQUENCE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];

  function installTouchKonamiPad(feedKey) {
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    const media = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    let timer = 0;
    let pointer = -1;
    let startX = 0;
    let startY = 0;
    let consumed = false;
    const cancel = () => { window.clearTimeout(timer); timer = 0; };
    const open = () => {
      if (!media.matches || document.querySelector(".touch-konami-pad")) return;
      consumed = true;
      let progress = 0;
      const overlay = document.createElement("div");
      overlay.className = "touch-konami-pad";
      overlay.innerHTML = `<section class="touch-konami-panel" role="dialog" aria-modal="true" aria-label="Secret code input"><button type="button" class="touch-konami-close" aria-label="Close">×</button><div class="touch-konami-title">SECRET INPUT</div><div class="touch-konami-progress" aria-hidden="true">${code.map(() => "<i></i>").join("")}</div><div class="touch-konami-controls"><div class="touch-konami-dpad"><button type="button" class="touch-konami-key touch-konami-up" data-konami-key="ArrowUp" aria-label="Up">↑</button><button type="button" class="touch-konami-key touch-konami-left" data-konami-key="ArrowLeft" aria-label="Left">←</button><button type="button" class="touch-konami-key touch-konami-down" data-konami-key="ArrowDown" aria-label="Down">↓</button><button type="button" class="touch-konami-key touch-konami-right" data-konami-key="ArrowRight" aria-label="Right">→</button></div><div class="touch-konami-ab"><button type="button" class="touch-konami-key" data-konami-key="b">B</button><button type="button" class="touch-konami-key" data-konami-key="a">A</button></div></div></section>`;
      const close = () => overlay.remove();
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay || event.target.closest(".touch-konami-close")) { close(); return; }
        const button = event.target.closest("[data-konami-key]");
        if (!button) return;
        const key = button.dataset.konamiKey;
        feedKey(key);
        progress = key === code[progress] ? progress + 1 : key === code[0] ? 1 : 0;
        overlay.querySelectorAll(".touch-konami-progress i").forEach((dot, index) => dot.classList.toggle("on", index < progress));
        if (progress === code.length) window.setTimeout(close, 420);
      });
      document.body.appendChild(overlay);
    };
    document.addEventListener("pointerdown", (event) => {
      if (!media.matches || event.clientX > 72 || event.clientY > 72) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      consumed = false;
      cancel();
      timer = window.setTimeout(open, 1200);
    }, true);
    document.addEventListener("pointermove", (event) => { if (event.pointerId === pointer && Math.hypot(event.clientX - startX, event.clientY - startY) > 14) cancel(); }, true);
    ["pointerup", "pointercancel"].forEach((type) => document.addEventListener(type, (event) => { if (event.pointerId !== pointer) return; cancel(); pointer = -1; if (consumed) { event.preventDefault(); event.stopPropagation(); } }, true));
    document.addEventListener("contextmenu", (event) => { if (media.matches && event.clientX <= 72 && event.clientY <= 72) event.preventDefault(); }, true);
  }

  const STORAGE = {
    character: "splash-adv-selected-character",
    cleared: "splash-adv-highest-cleared",
    best: "splash-adv-best",
    bgmEnabled: "splash-adv-bgm-enabled",
    sfxEnabled: "splash-adv-sfx-enabled",
    cgMode: "splash-adv-cg-mode-enabled",
    cgModeUnlocked: "splash-adv-cg-mode-unlocked",
    unlockedCgs: "splash-adv-unlocked-cgs",
  };

  const DIRECTIONS = [
    { x: 0, y: -1, name: "up" },
    { x: 1, y: 0, name: "right" },
    { x: 0, y: 1, name: "down" },
    { x: -1, y: 0, name: "left" },
  ];

  const FACTIONS = {
    ASTRA_NOVA: "astra-nova",
    PIRATES: "pirates",
  };

  const CHARACTERS = [
    {
      id: "Asteria",
      slug: "asteria",
      image: "./sprites/Asteria.png",
      swimsuitImage: "./sprites/swimsuit/Asteria_swimsuit.png",
      menuImage: "./art/keyart-layers/01-asteria.png",
      swimsuitMenuImage: "./art/keyart-layers/swimsuit/01-asteria.png",
    },
    {
      id: "Nyx",
      slug: "nyx",
      image: "./sprites/Nyx.png",
      swimsuitImage: "./sprites/swimsuit/Nyx_swimsuit.png",
      menuImage: "./art/keyart-layers/03-nyx.png",
      swimsuitMenuImage: "./art/keyart-layers/swimsuit/03-nyx.png",
    },
    {
      id: "Lumi",
      slug: "lumi",
      image: "./sprites/Lumi.png",
      swimsuitImage: "./sprites/swimsuit/Lumi_swimsuit.png",
      menuImage: "./art/keyart-layers/02-lumi.png",
      swimsuitMenuImage: "./art/keyart-layers/swimsuit/02-lumi.png",
    },
  ];

  const SPRITES = {
    bat: "./sprites/bat.png",
    mummy: "./sprites/mummy.png",
    pirate: "./sprites/pirate.png",
    turtle: "./sprites/turtle.png",
    balloon: "./sprites/balloon.png",
    crate: "./sprites/crate.png",
    stone: "./sprites/stone.png",
    hedge: "./sprites/hedge.png",
    needle: "./sprites/needle.png",
    shield: "./sprites/shield.png",
    turtleBadge: "./sprites/turtle-badge.png",
    capacityPlus: "./sprites/capacity-plus.png",
    rangeArrow: "./sprites/range-arrow.png",
  };

  const ITEM_NAMES = {
    turtle: "極速烏龜",
    needle: "救援針",
    shield: "水晶盾",
    range: "水量提升",
    capacity: "氣囊擴充",
  };

  const STAGES = [
    {
      name: "晴空運河",
      brief: "先熟悉十字水柱。打倒兩隻巡邏蝙蝠。",
      floor: "canal",
      ground: "./ground/01-sunny-canal.png",
      map: [
        "###########",
        "#P..C.C..A#",
        "#.#.#.#.#.#",
        "#..C...C..#",
        "#.#.#.#.#.#",
        "#....A....#",
        "#.#.#.#.#.#",
        "#..C...C..#",
        "#.#.#.#.#.#",
        "#..C.C....#",
        "###########",
      ],
    },
    {
      name: "月桂庭院",
      brief: "敵人會沿路巡邏，靠近且路線暢通時才會追擊。",
      floor: "garden",
      ground: "./ground/02-laurel-courtyard.png",
      map: [
        "###########",
        "#P.C..C..M#",
        "#.#.#.#.#.#",
        "#C..C..C..#",
        "#.#.#.#.#.#",
        "#..A...M..#",
        "#.#.#.#.#.#",
        "#C..C..C..#",
        "#.#.#.#.#.#",
        "#..C..C...#",
        "###########",
      ],
    },
    {
      name: "星砂遺跡",
      brief: "怪物數量增加。破壞箱子，尋找水量與氣囊升級。",
      floor: "ruins",
      ground: "./ground/03-star-sand-ruins.png",
      map: [
        "###########",
        "#P.C.C.C.M#",
        "#.#.#.#.#.#",
        "#C.C...C.C#",
        "#.#.#.#.#.#",
        "#A...M...A#",
        "#.#.#.#.#.#",
        "#C.C...C.C#",
        "#.#.#.#.#.#",
        "#M.C.C.C..#",
        "###########",
      ],
    },
    {
      name: "水都外環",
      brief: "狹窄通道與巡邏敵人。盾牌能擋下水柱與碰撞。",
      floor: "neon",
      ground: "./ground/04-water-city-ring.png",
      map: [
        "###########",
        "#P..C.C..A#",
        "#.#C#.#C#.#",
        "#C..M..C..#",
        "#.#.#.#.#.#",
        "#A.C...C.M#",
        "#.#.#.#.#.#",
        "#..C.A..C.#",
        "#.#C#.#C#.#",
        "#M..C.C...#",
        "###########",
      ],
    },
    {
      name: "羅德曼尼號",
      brief: "最終首領需要承受三次水柱。先清掉兩側護衛。",
      floor: "harbor",
      ground: "./ground/05-rodemanni-deck.png",
      map: [
        "###########",
        "#P.C...C.B#",
        "#.#.#.#.#.#",
        "#C..A..C..#",
        "#.#.#.#.#.#",
        "#..C.M.C..#",
        "#.#.#.#.#.#",
        "#C..A..C..#",
        "#.#.#.#.#.#",
        "#..C...C..#",
        "###########",
      ],
    },
  ];

  const backgroundMusic = new Audio(BACKGROUND_MUSIC_PATH);
  const bossMusic = new Audio(BOSS_MUSIC_PATH);
  const bubbleTrapSound = new Audio(BUBBLE_TRAP_SOUND_PATH);
  const bubblePopSound = new Audio(BUBBLE_POP_SOUND_PATH);
  const waterBallExplosionSound = new Audio(WATER_BALL_EXPLOSION_SOUND_PATH);
  const rescueNeedleSound = new Audio(RESCUE_NEEDLE_SOUND_PATH);
  const crystalShieldSound = new Audio(CRYSTAL_SHIELD_SOUND_PATH);
  const speedTurtleSound = new Audio(SPEED_TURTLE_SOUND_PATH);
  const itemPickupSound = new Audio(ITEM_PICKUP_SOUND_PATH);
  const uiConfirmSound = new Audio(UI_FEEDBACK_SOUND_PATH);
  const uiInteractionSound = new Audio(UI_FEEDBACK_SOUND_PATH);
  const uiDisabledSound = new Audio(UI_FEEDBACK_SOUND_PATH);
  const stageVictoryFanfareSound = new Audio(STAGE_VICTORY_FANFARE_SOUND_PATH);
  const cgShutterSound = CG_SHUTTER_SOUND_PATH
    ? new Audio(CG_SHUTTER_SOUND_PATH)
    : null;
  for (const music of [backgroundMusic, bossMusic]) {
    music.loop = true;
    music.preload = "auto";
  }
  backgroundMusic.volume = 0.32;
  bossMusic.volume = 0.34;
  for (const sound of [
    bubbleTrapSound,
    bubblePopSound,
    waterBallExplosionSound,
    rescueNeedleSound,
    crystalShieldSound,
    speedTurtleSound,
    itemPickupSound,
    uiConfirmSound,
    uiInteractionSound,
    uiDisabledSound,
    stageVictoryFanfareSound,
    ...(cgShutterSound ? [cgShutterSound] : []),
  ]) {
    sound.preload = "auto";
  }
  bubbleTrapSound.volume = 0.68;
  bubblePopSound.volume = 0.72;
  waterBallExplosionSound.volume = 0.7;
  rescueNeedleSound.volume = 0.74;
  crystalShieldSound.volume = 0.72;
  speedTurtleSound.volume = 0.72;
  itemPickupSound.volume = 0.7;
  uiConfirmSound.volume = 0.66;
  uiInteractionSound.volume = 0.48;
  uiInteractionSound.playbackRate = 1.28;
  uiInteractionSound.preservesPitch = false;
  uiDisabledSound.volume = 0.5;
  uiDisabledSound.playbackRate = 0.72;
  uiDisabledSound.preservesPitch = false;
  stageVictoryFanfareSound.volume = 0.76;
  if (cgShutterSound) cgShutterSound.volume = 0.82;

  let selectedCharacter;
  let cgModeEnabled;
  let cgModeUnlocked;
  let unlockedCgs;
  let cheatProgress = 0;
  let game = null;
  let gameDom = null;
  let frameId = 0;
  let lastRenderAt = 0;
  let dirty = false;
  let nextPlayerMoveAt = 0;
  let heldDirection = null;
  const heldMovementKeys = new Map();
  let lastEnemyContacts = new Set();
  let lastBlastContact = false;
  let activeMusic = backgroundMusic;
  let musicActivated = false;

  const safeStorage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // The game remains playable if a browser blocks file:// storage.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // The game remains playable if a browser blocks file:// storage.
      }
    },
  };

  function readUnlockedCgs() {
    try {
      const saved = JSON.parse(safeStorage.get(STORAGE.unlockedCgs) ?? "[]");
      if (!Array.isArray(saved)) return new Set();
      const validKeys = new Set(cgEntries().map((entry) => entry.key));
      return new Set(saved.filter((key) => validKeys.has(key)));
    } catch {
      return new Set();
    }
  }

  function persistUnlockedCgs() {
    safeStorage.set(STORAGE.unlockedCgs, JSON.stringify([...unlockedCgs].sort()));
  }

  function characterById(characterId) {
    return (
      CHARACTERS.find((character) => character.id === characterId) ??
      CHARACTERS[2]
    );
  }

  function characterAsset(character, kind) {
    if (kind === "menu") {
      return cgModeEnabled && character.swimsuitMenuImage
        ? character.swimsuitMenuImage
        : character.menuImage;
    }
    return cgModeEnabled && character.swimsuitImage
      ? character.swimsuitImage
      : character.image;
  }

  function cgKey(characterId, stageIndex, outcome) {
    return `${characterById(characterId).slug}:${stageIndex}:${outcome}`;
  }

  function cgEntry(characterId, stageIndex, outcome) {
    const character = characterById(characterId);
    const stageNumber = String(stageIndex + 1).padStart(2, "0");
    const base = `./assets/cg/${character.slug}/stage-${stageNumber}/${outcome}`;
    return {
      key: cgKey(character.id, stageIndex, outcome),
      characterId: character.id,
      characterSlug: character.slug,
      stageIndex,
      outcome,
      image: `${base}.webp`,
      video: `${base}.mp4`,
    };
  }

  function cgEntries(characterId = null) {
    const characters = characterId
      ? [characterById(characterId)]
      : CHARACTERS;
    return characters.flatMap((character) =>
      STAGES.flatMap((_, stageIndex) => [
        cgEntry(character.id, stageIndex, "victory"),
        cgEntry(character.id, stageIndex, "defeat"),
      ]),
    );
  }

  let bgmEnabled = safeStorage.get(STORAGE.bgmEnabled) !== "false";
  let sfxEnabled = safeStorage.get(STORAGE.sfxEnabled) !== "false";
  const storedCgMode = safeStorage.get(STORAGE.cgMode);
  cgModeUnlocked = safeStorage.get(STORAGE.cgModeUnlocked) === "true" || storedCgMode === "true";
  cgModeEnabled = cgModeUnlocked && storedCgMode !== "false";
  if (cgModeUnlocked) safeStorage.set(STORAGE.cgModeUnlocked, "true");
  unlockedCgs = readUnlockedCgs();
  selectedCharacter = readCharacter();

  function applyCgModeState() {
    document.documentElement.classList.toggle("cg-mode-enabled", cgModeEnabled);
    document.documentElement.classList.toggle("cg-mode-unlocked", cgModeUnlocked);
    document.documentElement.dataset.cgMode = cgModeEnabled ? "enabled" : "disabled";
  }

  function armMusicActivation() {
    if (!bgmEnabled) return;
    window.addEventListener("pointerdown", playActiveMusic);
    window.addEventListener("keydown", playActiveMusic);
  }

  function disarmMusicActivation() {
    window.removeEventListener("pointerdown", playActiveMusic);
    window.removeEventListener("keydown", playActiveMusic);
  }

  function playActiveMusic() {
    if (!bgmEnabled) {
      pauseAllMusic();
      return;
    }
    if (!activeMusic.paused) {
      musicActivated = true;
      disarmMusicActivation();
      return;
    }

    const requestedMusic = activeMusic;
    requestedMusic
      .play()
      .then(() => {
        musicActivated = true;
        disarmMusicActivation();
        if (requestedMusic === activeMusic) return;
        requestedMusic.pause();
        if (bgmEnabled) activeMusic.play().catch(armMusicActivation);
      })
      .catch(armMusicActivation);
  }

  function pauseAllMusic() {
    backgroundMusic.pause();
    bossMusic.pause();
    disarmMusicActivation();
  }

  function switchSoundtrack(nextMusic, restart = false) {
    if (activeMusic !== nextMusic) {
      activeMusic.pause();
      activeMusic.currentTime = 0;
      activeMusic = nextMusic;
      restart = true;
    }
    if (restart) activeMusic.currentTime = 0;
    if (musicActivated && bgmEnabled) activeMusic.play().catch(armMusicActivation);
  }

  function playSoundEffect(source) {
    if (!sfxEnabled) return;
    const sound = source.cloneNode();
    sound.volume = source.volume;
    sound.playbackRate = source.playbackRate;
    sound.preservesPitch = source.preservesPitch;
    sound.play().catch(() => {
      // Sound effects are optional if the browser blocks media playback.
    });
  }

  function audioControlsMarkup() {
    return `
      <div class="audio-controls" aria-label="音訊設定">
        <button
          class="audio-toggle"
          type="button"
          data-action="toggle-bgm"
          data-ui-sound="custom"
          aria-label="${bgmEnabled ? "關閉" : "開啟"}背景音樂"
          aria-pressed="${bgmEnabled}"
          title="背景音樂：${bgmEnabled ? "開啟" : "關閉"}"
        ><span class="audio-toggle-icon" aria-hidden="true">🎵</span></button>
        <button
          class="audio-toggle"
          type="button"
          data-action="toggle-sfx"
          data-ui-sound="custom"
          aria-label="${sfxEnabled ? "關閉" : "開啟"}音效"
          aria-pressed="${sfxEnabled}"
          title="音效：${sfxEnabled ? "開啟" : "關閉"}"
        ><span class="audio-toggle-icon" aria-hidden="true">🔊</span></button>
      </div>
    `;
  }

  function syncAudioControls() {
    for (const button of document.querySelectorAll('[data-action="toggle-bgm"]')) {
      button.setAttribute("aria-pressed", String(bgmEnabled));
      button.setAttribute("aria-label", `${bgmEnabled ? "關閉" : "開啟"}背景音樂`);
      button.title = `背景音樂：${bgmEnabled ? "開啟" : "關閉"}`;
    }
    for (const button of document.querySelectorAll('[data-action="toggle-sfx"]')) {
      button.setAttribute("aria-pressed", String(sfxEnabled));
      button.setAttribute("aria-label", `${sfxEnabled ? "關閉" : "開啟"}音效`);
      button.title = `音效：${sfxEnabled ? "開啟" : "關閉"}`;
    }
  }

  function toggleBackgroundMusic() {
    playSoundEffect(uiInteractionSound);
    bgmEnabled = !bgmEnabled;
    safeStorage.set(STORAGE.bgmEnabled, String(bgmEnabled));
    if (bgmEnabled) {
      playActiveMusic();
    } else {
      pauseAllMusic();
    }
    syncAudioControls();
  }

  function toggleSoundEffects() {
    if (sfxEnabled) {
      playSoundEffect(uiInteractionSound);
      sfxEnabled = false;
    } else {
      sfxEnabled = true;
      playSoundEffect(uiInteractionSound);
    }
    safeStorage.set(STORAGE.sfxEnabled, String(sfxEnabled));
    syncAudioControls();
  }

  function bindSettingsControls() {
    for (const button of document.querySelectorAll('[data-action="toggle-bgm"]')) {
      button.addEventListener("click", toggleBackgroundMusic);
    }
    for (const button of document.querySelectorAll('[data-action="toggle-sfx"]')) {
      button.addEventListener("click", toggleSoundEffects);
    }
    document
      .querySelector('[data-action="reset-progress"]')
      ?.addEventListener("click", () => {
        showModal(`
          <section class="help-dialog progress-reset-dialog" data-modal-static role="dialog" aria-modal="true" aria-labelledby="reset-progress-title">
            <button class="close-button" data-close aria-label="關閉">×</button>
            <span class="panel-label">RESET DATA</span>
            <h2 id="reset-progress-title">重置所有進度？</h2>
            <p>通關紀錄、最佳時間、CG 解鎖與密技模式都會被清除，且無法復原。角色選擇與音訊設定會保留。</p>
            <div class="result-actions">
              <button class="secondary-button" type="button" data-close>取消</button>
              <button class="primary-button compact reset-confirm-button" type="button" data-reset-confirm>確認重置</button>
            </div>
          </section>
        `);
        document.querySelector("[data-reset-confirm]")?.addEventListener("click", () => {
          safeStorage.remove(STORAGE.cleared);
          safeStorage.remove(STORAGE.best);
          safeStorage.remove(STORAGE.cgMode);
          safeStorage.remove(STORAGE.cgModeUnlocked);
          safeStorage.remove(STORAGE.unlockedCgs);
          window.location.reload();
        });
      });
  }

  function isDisabledUiControl(control) {
    return (
      control.matches(":disabled") ||
      control.getAttribute("aria-disabled") === "true"
    );
  }

  function armUiSoundFeedback() {
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest("button, [role='button']");
        if (control?.matches(":disabled")) {
          playSoundEffect(uiDisabledSound);
        }
      },
      true,
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest("button, [role='button']");
        if (!control) {
          if (event.target.classList.contains("modal-backdrop")) {
            playSoundEffect(uiInteractionSound);
          }
          return;
        }
        if (isDisabledUiControl(control)) {
          playSoundEffect(uiDisabledSound);
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (control.dataset.uiSound === "custom") return;
        playSoundEffect(uiInteractionSound);
      },
      true,
    );
  }

  function readCharacter() {
    const saved = safeStorage.get(STORAGE.character);
    return CHARACTERS.some((character) => character.id === saved)
      ? saved
      : "Lumi";
  }

  function selectedSprite() {
    const character = characterById(selectedCharacter);
    return { ...character, image: characterAsset(character, "sprite") };
  }

  function showCgModeToast(message = "泳裝與 CG 模式已啟用") {
    document.querySelector(".cg-mode-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "cg-mode-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <strong>CG MODE</strong>
      <span>${message}</span>
    `;
    document.body.append(toast);
    window.setTimeout(() => toast.classList.add("is-visible"), 20);
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  function setCgModeEnabled(enabled) {
    if (!cgModeUnlocked) return;
    cgModeEnabled = Boolean(enabled);
    safeStorage.set(STORAGE.cgMode, String(cgModeEnabled));
    applyCgModeState();
    const isMenu = Boolean(document.querySelector(".menu-screen"));
    if (isMenu) renderMenu();
    showCgModeToast(cgModeEnabled ? "泳裝與 CG 模式已啟用" : "已切換為一般模式");
    playSoundEffect(uiConfirmSound);
    dirty = true;
  }

  function unlockCgMode() {
    if (cgModeUnlocked) return;
    cgModeUnlocked = true;
    cheatProgress = 0;
    safeStorage.set(STORAGE.cgModeUnlocked, "true");
    setCgModeEnabled(true);
  }

  function trackCheatKey(key) {
    if (cgModeUnlocked) {
      return false;
    }
    const normalized = key.length === 1 ? key.toLowerCase() : key;
    if (normalized === CHEAT_SEQUENCE[cheatProgress]) {
      cheatProgress += 1;
      if (cheatProgress === CHEAT_SEQUENCE.length) unlockCgMode();
      return true;
    }
    cheatProgress = normalized === CHEAT_SEQUENCE[0] ? 1 : 0;
    return cheatProgress === 1;
  }

  function trackCheat(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false;
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return false;
    }
    return trackCheatKey(event.key);
  }

  function unlockCg(entry) {
    if (unlockedCgs.has(entry.key)) return false;
    unlockedCgs.add(entry.key);
    persistUnlockedCgs();
    return true;
  }

  function highestCleared() {
    const saved = Number(safeStorage.get(STORAGE.cleared) ?? -1);
    return Number.isInteger(saved)
      ? Math.max(-1, Math.min(STAGES.length - 1, saved))
      : -1;
  }

  function bestTimes() {
    try {
      const parsed = JSON.parse(safeStorage.get(STORAGE.best) ?? "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function keyOf(x, y) {
    return `${x},${y}`;
  }

  function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function bindMenuParallax() {
    const menuScreen = document.querySelector(".menu-screen");
    const menuStage = document.querySelector(".menu-keyart-stage");
    if (
      !menuScreen ||
      !menuStage ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    menuScreen.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = menuScreen.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12;
      menuStage.style.setProperty("--parallax-x", `${x.toFixed(2)}px`);
      menuStage.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
    });
    menuScreen.addEventListener("pointerleave", () => {
      menuStage.style.setProperty("--parallax-x", "0px");
      menuStage.style.setProperty("--parallax-y", "0px");
    });
  }

  function renderMenu() {
    stopLoop();
    switchSoundtrack(backgroundMusic, activeMusic !== backgroundMusic);
    heldMovementKeys.clear();
    heldDirection = null;
    game = null;
    gameDom = null;
    const cleared = highestCleared();
    const meta =
      cleared < 0 ? "尚無通關紀錄" : `已突破 ${cleared + 1} / ${STAGES.length} 區域`;
    const asteria = characterById("Asteria");
    const nyx = characterById("Nyx");
    const lumi = characterById("Lumi");

    document.body.innerHTML = `
      <main class="menu-screen">
        <div class="menu-visual" aria-label="Asteria、Lumi 與 Nyx 的水都冒險主視覺">
          <div class="menu-keyart-stage">
            <img class="menu-art menu-art-background" src="./art/keyart-layers/00-background.png" alt="">
            <img class="menu-art menu-art-splashes" src="./art/keyart-layers/03-water-splashes.png" alt="">
            <img class="menu-character menu-character-asteria" src="${characterAsset(asteria, "menu")}" alt="Asteria">
            <img class="menu-character menu-character-nyx" src="${characterAsset(nyx, "menu")}" alt="Nyx">
            <img class="menu-character menu-character-lumi" src="${characterAsset(lumi, "menu")}" alt="Lumi">
            <div class="menu-art menu-art-balls" aria-hidden="true">
              <img class="menu-water-ball ball-1" src="./art/keyart-layers/02-water-balls_01.png" alt="">
              <img class="menu-water-ball ball-2" src="./art/keyart-layers/02-water-balls_02.png" alt="">
              <img class="menu-water-ball ball-3" src="./art/keyart-layers/02-water-balls_03.png" alt="">
              <img class="menu-water-ball ball-4" src="./art/keyart-layers/02-water-balls_04.png" alt="">
              <img class="menu-water-ball ball-5" src="./art/keyart-layers/02-water-balls_05.png" alt="">
              <img class="menu-water-ball ball-6" src="./art/keyart-layers/02-water-balls_06.png" alt="">
            </div>
          </div>
        </div>
        <div class="menu-vignette"></div>
        <div class="menu-utilities" aria-label="遊戲設定">
          ${audioControlsMarkup()}
          <div class="menu-language-control" data-language-switcher></div>
          <button class="progress-reset-button" type="button" data-action="reset-progress">重置進度</button>
        </div>
        <section class="menu-card">
          <div class="menu-card-heading">
            <div class="eyebrow">AstraNova</div>
            ${
              cgModeUnlocked
                ? `<button class="cg-mode-badge${cgModeEnabled ? "" : " is-disabled"}" type="button" data-action="toggle-cg-mode" data-ui-sound="custom" aria-pressed="${cgModeEnabled}" aria-label="${cgModeEnabled ? "關閉 CG 模式" : "開啟 CG 模式"}" title="點擊切換 CG／一般模式"><span></span>CG MODE</button>`
                : ""
            }
          </div>
          <h1>Splash ADV</h1>
          <p class="menu-lead">突破五個區域，阻止海盜空港的入侵！</p>
          ${characterSelectorMarkup()}
          <div class="menu-actions">
            <button class="primary-button" data-action="stages" data-ui-sound="custom">
              <span>開始任務</span><small>5 STAGES</small>
            </button>
            <button class="secondary-button" data-action="help">遊戲說明</button>
            ${
              cgModeEnabled
                ? `<button class="secondary-button gallery-button" data-action="gallery"><span>CG 圖鑑</span><small>${unlockedCgs.size} / ${cgEntries().length}</small></button>`
                : ""
            }
          </div>
          <div class="menu-meta">
            <span class="menu-progress">鍵盤・觸控皆可・${meta}</span>
          </div>
        </section>
      </main>
    `;

    if (window.GameI18n) {
      window.GameI18n.setLanguage(window.GameI18n.language);
    }

    bindSettingsControls();
    document
      .querySelector('[data-action="stages"]')
      .addEventListener("click", () => {
        playSoundEffect(uiConfirmSound);
        showStageSelect();
      });
    document
      .querySelector('[data-action="help"]')
      .addEventListener("click", showHelp);
    document
      .querySelector('[data-action="gallery"]')
      ?.addEventListener("click", () => showCgGallery(selectedCharacter));
    document
      .querySelector('[data-action="toggle-cg-mode"]')
      ?.addEventListener("click", () => setCgModeEnabled(!cgModeEnabled));

    for (const option of document.querySelectorAll(".character-option")) {
      option.addEventListener("click", () => {
        playSoundEffect(uiConfirmSound);
        selectedCharacter = option.dataset.character;
        safeStorage.set(STORAGE.character, selectedCharacter);
        syncCharacterSelector(true);
      });
    }

    bindMenuParallax();
    requestAnimationFrame(() => syncCharacterSelector(true));
  }

  function characterSelectorMarkup() {
    const options = CHARACTERS.map(
      (character) => `
        <button
          class="character-option${character.id === selectedCharacter ? " is-selected" : ""}"
          type="button"
          data-character="${character.id}"
          data-ui-sound="custom"
          aria-label="選擇 ${character.id}"
          aria-pressed="${character.id === selectedCharacter}"
        >
          <img class="character-option__portrait" src="${characterAsset(character, "sprite")}" alt="" draggable="false">
          <span class="character-option__name">${character.id}</span>
        </button>
      `,
    ).join("");

    return `
      <section class="character-select" aria-label="選擇角色">
        <p class="character-select__title">SELECT CHARACTER</p>
        <div class="character-select__options">${options}</div>
      </section>
    `;
  }

  function syncCharacterSelector(animate) {
    for (const option of document.querySelectorAll(".character-option")) {
      const isSelected = option.dataset.character === selectedCharacter;
      option.classList.toggle("is-selected", isSelected);
      option.classList.remove("is-jumping", "is-breathing");
      option.setAttribute("aria-pressed", String(isSelected));
    }

    const selected = document.querySelector(
      `.character-option[data-character="${selectedCharacter}"]`,
    );
    if (!selected) return;
    if (
      !animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      selected.classList.add("is-breathing");
      return;
    }

    selected.classList.add("is-jumping");
    selected.addEventListener(
      "animationend",
      (event) => {
        if (event.animationName !== "character-select-jump") return;
        selected.classList.remove("is-jumping");
        selected.classList.add("is-breathing");
      },
      { once: true },
    );
  }

  function showStageSelect() {
    const cleared = highestCleared();
    const options = STAGES.map((stage, index) => {
      const unlocked = index <= Math.min(STAGES.length - 1, cleared + 1);
      const state = !unlocked ? "未解鎖" : index <= cleared ? "已通過" : "可進入";
      return `
        <button
          class="stage-option${unlocked ? "" : " locked"}"
          data-stage="${index}"
          data-ui-sound="custom"
          aria-disabled="${!unlocked}"
        >
          <span class="stage-option-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="stage-option-copy">
            <strong>${stage.name}</strong>
          </span>
          <em class="stage-option-state">${state}</em>
        </button>
      `;
    }).join("");

    showModal(`
      <section class="stage-select-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-title">
        <button class="close-button" data-close aria-label="關閉">×</button>
        <span class="panel-label">MISSION SELECT</span>
        <h2 id="stage-title">選擇任務區域</h2>
        <p>可進入已通過的關卡，以及目前進度的下一關。</p>
        <div class="stage-select-grid">${options}</div>
      </section>
    `);

    for (const button of document.querySelectorAll(
      '[data-stage]:not([aria-disabled="true"])',
    )) {
      button.addEventListener("click", () => {
        playSoundEffect(uiConfirmSound);
        startStage(Number(button.dataset.stage));
      });
    }
  }

  function showHelp() {
    showModal(`
      <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button class="close-button" data-close aria-label="關閉">×</button>
        <span class="panel-label">HOW TO PLAY</span>
        <h2 id="help-title">遊戲說明</h2>
        <div class="help-tabs" role="tablist">
          <button class="help-tab is-active" data-help-page="0">操作方式</button>
          <button class="help-tab" data-help-page="1">道具與強化</button>
          <button class="help-tab" data-help-page="2">怪物</button>
          <button class="help-tab" data-help-page="3">場景物件</button>
        </div>
        <div class="help-pages">
          <section class="help-page is-active" data-help-content="0">
            <div class="help-hero-icon">⌨</div>
            <div class="help-cards">
              <article><b>MOVE</b><h4>移動</h4><p>使用 WASD 或方向鍵在格子間移動。</p></article>
              <article><b>ACTION</b><h4>放置水球</h4><p>按下 Space 放置水球；倒數結束後會向四方爆發水柱。</p></article>
              <article><b>GOAL</b><h4>完成關卡</h4><p>避開爆炸，消滅所有敵人並完成關卡。</p></article>
            </div>
          </section>
          <section class="help-page" data-help-content="1">
            <div class="help-cards help-icon-cards">
              <article><img src="${SPRITES.balloon}" alt=""><h4>水球</h4><p>基本攻擊，放置後產生十字形水柱。</p></article>
              <article><span class="help-item-stack"><img src="${SPRITES.balloon}" alt=""><img src="${SPRITES.capacityPlus}" alt=""></span><h4>水球數量＋</h4><p>提升同時可放置的水球數量。</p></article>
              <article><span class="help-item-stack"><img src="${SPRITES.balloon}" alt=""><img src="${SPRITES.rangeArrow}" alt=""></span><h4>爆炸範圍↑</h4><p>增加水柱向四方延伸的格數。</p></article>
              <article><img src="${SPRITES.needle}" alt=""><h4>救援針</h4><p>解救泡泡困住的角色。</p></article>
              <article><img src="${SPRITES.shield}" alt=""><h4>護盾</h4><p>立即脫困並獲得短暫防護。</p></article>
              <article><img src="${SPRITES.turtleBadge}" alt=""><h4>水龜坐騎</h4><p>提升移動速度，可替角色抵擋一次攻擊。</p></article>
            </div>
          </section>
          <section class="help-page" data-help-content="2">
            <div class="help-cards help-icon-cards">
              <article><img src="${SPRITES.bat}" alt=""><h4>蝙蝠</h4><p>移動敏捷，會在通道間巡邏。</p></article>
              <article><img src="${SPRITES.mummy}" alt=""><h4>木乃伊</h4><p>在狹窄路線中追蹤玩家。</p></article>
              <article><img src="${SPRITES.pirate}" alt=""><h4>海盜</h4><p>耐久較高，接近時要小心。</p></article>
            </div>
          </section>
          <section class="help-page" data-help-content="3">
            <div class="help-cards help-icon-cards">
              <article><img src="${SPRITES.stone}" alt=""><h4>石頭</h4><p>不可破壞的固定障礙。</p></article>
              <article><img src="${SPRITES.hedge}" alt=""><h4>樹籬</h4><p>花園關卡中的固定障礙。</p></article>
              <article><img src="${SPRITES.crate}" alt=""><h4>木箱</h4><p>可被水柱炸毀，可能掉落道具。</p></article>
            </div>
          </section>
        </div>
      </section>
    `);

    const pages = document.querySelectorAll("[data-help-content]");
    const tabs = document.querySelectorAll("[data-help-page]");
    let page = 0;
    const update = () => {
      pages.forEach((panel, index) => {
        panel.classList.toggle("is-active", index === page);
      });
      tabs.forEach((tab, index) => {
        tab.classList.toggle("is-active", index === page);
      });
    };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        page = Number(tab.dataset.helpPage);
        update();
      });
    });
  }

  function showCgGallery(characterId = selectedCharacter) {
    if (!cgModeEnabled) return;
    const activeCharacter = characterById(characterId);
    const entries = cgEntries(activeCharacter.id);
    const tabs = CHARACTERS.map(
      (character) => `
        <button
          class="cg-gallery-tab${character.id === activeCharacter.id ? " is-active" : ""}"
          type="button"
          data-gallery-character="${character.id}"
          aria-selected="${character.id === activeCharacter.id}"
        >${character.id}</button>
      `,
    ).join("");
    const cards = entries
      .map((entry) => {
        const unlocked = unlockedCgs.has(entry.key);
        const outcomeLabel = entry.outcome === "victory" ? "勝利" : "失敗";
        return `
          <button
            class="cg-gallery-card${unlocked ? " is-unlocked" : " is-locked"}"
            type="button"
            data-cg-key="${entry.key}"
            ${unlocked ? "" : "disabled"}
            aria-label="${unlocked ? `${entry.characterId} 第 ${entry.stageIndex + 1} 關 ${outcomeLabel} CG` : `未解鎖 CG` }"
          >
            <span class="cg-gallery-preview">
              ${
                unlocked
                  ? `<img src="${entry.image}" alt="" loading="lazy" decoding="async">`
                  : '<span class="cg-gallery-lock" aria-hidden="true">◆</span>'
              }
            </span>
            <span class="cg-gallery-card-copy">
              <small>STAGE ${String(entry.stageIndex + 1).padStart(2, "0")}</small>
              <strong>${outcomeLabel}</strong>
            </span>
          </button>
        `;
      })
      .join("");

    showModal(`
      <section class="cg-gallery-dialog" role="dialog" aria-modal="true" aria-labelledby="cg-gallery-title">
        <button class="close-button" data-close aria-label="關閉">×</button>
        <span class="panel-label">COLLECTION</span>
        <div class="cg-gallery-heading">
          <div>
            <h2 id="cg-gallery-title">CG 圖鑑</h2>
          </div>
        </div>
        <div class="cg-gallery-tabs-row">
          <div class="cg-gallery-tabs" role="tablist" aria-label="角色">${tabs}</div>
          <strong class="cg-gallery-count">${unlockedCgs.size} / ${cgEntries().length}</strong>
        </div>
        <div class="cg-gallery-grid">${cards}</div>
      </section>
    `);

    for (const tab of document.querySelectorAll("[data-gallery-character]")) {
      tab.addEventListener("click", () => showCgGallery(tab.dataset.galleryCharacter));
    }
    for (const card of document.querySelectorAll(".cg-gallery-card.is-unlocked")) {
      card.addEventListener("click", () => {
        const entry = cgEntries().find((candidate) => candidate.key === card.dataset.cgKey);
        if (entry) showCgViewer(entry);
      });
    }
  }

  function showCgViewer(entry) {
    if (!unlockedCgs.has(entry.key)) return;
    const outcomeLabel = entry.outcome === "victory" ? "勝利" : "失敗";
    showModal(`
      <section class="cg-viewer" data-modal-static role="dialog" aria-modal="true" aria-label="CG 全螢幕檢視">
        <div class="cg-viewer-stage">
          <video
            class="cg-viewer-media"
            src="${entry.video}"
            muted
            loop
            playsinline
            preload="metadata"
          ></video>
          <img class="cg-viewer-media" src="${entry.image}" alt="${entry.characterId} 第 ${entry.stageIndex + 1} 關 ${outcomeLabel} CG" hidden>
        </div>
        <div class="cg-viewer-topbar">
          <div>
            <span>STAGE ${String(entry.stageIndex + 1).padStart(2, "0")}</span>
            <strong>${entry.characterId} · ${outcomeLabel}</strong>
          </div>
          <button class="cg-viewer-close" type="button" data-close aria-label="關閉">×</button>
        </div>
        <div class="cg-viewer-switch" role="group" aria-label="CG 顯示模式">
          <button type="button" data-cg-view="static" aria-pressed="false">靜態</button>
          <button class="is-active" type="button" data-cg-view="animated" aria-pressed="true">動態</button>
        </div>
      </section>
    `);
    const backdrop = document.querySelector(".modal-backdrop");
    const viewer = backdrop?.querySelector(".cg-viewer");
    const video = viewer?.querySelector("video");
    const image = viewer?.querySelector("img");
    if (!backdrop || !viewer || !video || !image) return;
    backdrop.classList.add("cg-viewer-backdrop");
    document.body.classList.add("cg-overlay-open");

    const setView = (view) => {
      const animated = view === "animated";
      video.hidden = !animated;
      image.hidden = animated;
      for (const button of viewer.querySelectorAll("[data-cg-view]")) {
        const active = button.dataset.cgView === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      }
      if (animated) {
        video.play().catch(() => setView("static"));
      } else {
        video.pause();
      }
    };

    video.addEventListener("error", () => setView("static"), { once: true });
    for (const button of viewer.querySelectorAll("[data-cg-view]")) {
      button.addEventListener("click", () => setView(button.dataset.cgView));
    }
    viewer.querySelector("[data-close]")?.addEventListener("click", () => {
      video.pause();
      document.body.classList.remove("cg-overlay-open");
    });
    setView("animated");
  }

  function showModal(content) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = content;
    backdrop.addEventListener("click", (event) => {
      const staticModal = backdrop.querySelector("[data-modal-static]");
      if (event.target === backdrop && staticModal) return;
      if (event.target === backdrop || event.target.closest("[data-close]")) {
        closeModal();
      }
    });
    document.body.append(backdrop);
  }

  function closeModal() {
    const backdrop = document.querySelector(".modal-backdrop");
    for (const video of backdrop?.querySelectorAll("video") ?? []) video.pause();
    backdrop?.remove();
    document.body.classList.remove("cg-overlay-open");
  }

  function createStage(stageIndex, carry = null) {
    const stage = STAGES[stageIndex];
    const crates = new Set();
    const enemies = [];
    let spawnX = 1;
    let spawnY = 1;

    stage.map.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === "P") {
          spawnX = x;
          spawnY = y;
        }
        if (cell === "C") crates.add(keyOf(x, y));
        if (["A", "M", "B"].includes(cell)) {
          const kind = cell === "A" ? "bat" : cell === "M" ? "mummy" : "pirate";
          enemies.push({
            id: `${stageIndex}-${x}-${y}-${kind}`,
            kind,
            faction: FACTIONS.PIRATES,
            x,
            y,
            facing: "right",
            hp: kind === "pirate" ? 3 : 1,
            trappedUntil: 0,
            patrolDirection: (stageIndex + x + y) % DIRECTIONS.length,
            nextMoveAt: 0,
          });
        }
      });
    });

    return {
      status: "playing",
      stageIndex,
      crates,
      pickups: [],
      enemies,
      bombs: [],
      blasts: [],
      player: {
        faction: FACTIONS.ASTRA_NOVA,
        x: spawnX,
        y: spawnY,
        facing: "right",
        spawnX,
        spawnY,
        lives: carry?.player?.lives ?? 3,
        range: carry?.player?.range ?? 2,
        capacity: carry?.player?.capacity ?? 1,
        trappedUntil: 0,
        shieldUntil: 0,
        turtleMounted: carry?.player?.turtleMounted ?? false,
      },
      inventory: carry?.inventory ?? { turtle: 1, needle: 2, shield: 1 },
      stageTimes: carry?.stageTimes ?? [],
      startedAt: Date.now(),
      now: Date.now(),
      message: stage.brief,
    };
  }

  function startStage(stageIndex, carry = null) {
    closeModal();
    const isBossStage = stageIndex === STAGES.length - 1;
    switchSoundtrack(isBossStage ? bossMusic : backgroundMusic, isBossStage);
    game = createStage(stageIndex, carry);
    heldMovementKeys.clear();
    heldDirection = null;
    nextPlayerMoveAt = 0;
    lastEnemyContacts = new Set();
    lastBlastContact = false;
    mountGame();
    dirty = true;
    startLoop();
  }

  function mountGame() {
    const stage = STAGES[game.stageIndex];
    document.body.innerHTML = `
      <main class="game-screen theme-${stage.floor}">
        <div class="game-layout">
          <section class="board-column">
            <div class="hud-row">
              <div class="hud-chip"><span>生命</span><strong data-hud="lives"></strong></div>
              <div class="hud-chip"><span>時間</span><strong data-hud="time"></strong></div>
              <div class="hud-chip accent"><span>敵人</span><strong data-hud="enemies"></strong></div>
              <div class="top-actions hud-actions">
                ${audioControlsMarkup()}
                <div class="hud-language-control" data-language-switcher></div>
                <button data-action="help">說明</button>
                <button data-action="menu">返回</button>
              </div>
            </div>
            <div class="board-frame">
              <div class="board-grid" data-board style="--board-ground: url('${stage.ground}')"></div>
            </div>
            <div class="message-bar"><i class="message-dot"></i><span data-message></span></div>
            <div class="touch-controls">
              <div class="dpad">
                <button class="up" data-dir="0" aria-label="上">▲</button>
                <button class="left" data-dir="3" aria-label="左">◀</button>
                <button class="down" data-dir="2" aria-label="下">▼</button>
                <button class="right" data-dir="1" aria-label="右">▶</button>
              </div>
              <div class="touch-actions">
                <button data-item="turtle" data-ui-sound="custom">1</button>
                <button data-item="needle" data-ui-sound="custom">2</button>
                <button data-item="shield" data-ui-sound="custom">3</button>
                <button class="bomb-touch" data-action="bomb" data-ui-sound="custom"><img src="${SPRITES.balloon}" alt="放置水泡"></button>
              </div>
            </div>
          </section>
          <aside class="side-panel">
            <section class="brief-card">
              <span class="panel-label">MISSION BRIEF</span>
              <h2>${stage.name}</h2>
              <p>${stage.brief}</p>
              <div class="power-stats">
                <div><span>水量</span><strong data-stat="range"></strong></div>
                <div><span>氣囊</span><strong data-stat="capacity"></strong></div>
                <div><span>速度</span><strong data-stat="speed"></strong></div>
              </div>
            </section>
            <section class="inventory-panel">
              <span class="panel-label">RESCUE ITEMS</span>
              ${itemButtonMarkup("turtle", "1", SPRITES.turtleBadge)}
              ${itemButtonMarkup("needle", "2", SPRITES.needle)}
              ${itemButtonMarkup("shield", "3", SPRITES.shield)}
            </section>
            <section class="keyboard-card">
              <div><span>移動</span><kbd>WASD / ↑↓←→</kbd></div>
              <div><span>放置水泡</span><kbd>SPACE</kbd></div>
            </section>
          </aside>
        </div>
      </main>
    `;

    if (window.GameI18n) {
      window.GameI18n.setLanguage(window.GameI18n.language);
    }

    const board = document.querySelector("[data-board]");
    document.querySelector(".game-screen")?.insertAdjacentHTML(
      "beforeend",
      `
        <div class="mobile-touch-surface" aria-hidden="true">
          <span class="free-joystick"></span>
          <div class="free-items">
            <button data-free-item="turtle" data-ui-sound="custom" tabindex="-1"><img src="${SPRITES.turtleBadge}" alt=""></button>
            <button data-free-item="needle" data-ui-sound="custom" tabindex="-1"><img src="${SPRITES.needle}" alt=""></button>
            <button data-free-item="shield" data-ui-sound="custom" tabindex="-1"><img src="${SPRITES.shield}" alt=""></button>
          </div>
        </div>
      `,
    );
    const surface = document.querySelector(".mobile-touch-surface");
    if (surface) {
      const knob = surface.querySelector(".free-joystick");
      const items = surface.querySelector(".free-items");
      let joystickPointerId = null;
      let actionPointerId = null;
      let itemTimer = 0;
      let rightActionActive = false;
      let joystickRing = null;
      let joystickOrigin = null;

      const clearItemTimer = () => {
        if (!itemTimer) return;
        clearTimeout(itemTimer);
        itemTimer = 0;
      };
      const hideTouchJoystick = () => {
        joystickOrigin = null;
        joystickRing?.remove();
        joystickRing = null;
        if (!surface.querySelector(".keyboard-joystick-ring")) {
          knob.classList.remove("is-visible");
          knob.style.transform = "translate(-50%,-50%)";
        }
      };

      surface.addEventListener("pointerdown", (event) => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest("[data-free-item]")) return;
        if (surface.classList.contains("show-items")) {
          if (!event.target.closest(".free-items")) {
            surface.classList.remove("show-items");
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return;
        }
        const bounds = surface.getBoundingClientRect();
        const localX = event.clientX - bounds.left;
        const localY = event.clientY - bounds.top;

        if (event.clientX < innerWidth / 2) {
          if (joystickPointerId !== null) return;
          event.preventDefault();
          joystickPointerId = event.pointerId;
          surface.setPointerCapture?.(event.pointerId);
          joystickOrigin = {
            clientX: event.clientX,
            clientY: event.clientY,
            x: localX,
            y: localY,
          };
          joystickRing = document.createElement("span");
          joystickRing.className = "free-joystick-ring";
          joystickRing.style.left = `${localX}px`;
          joystickRing.style.top = `${localY}px`;
          surface.append(joystickRing);
          knob.style.left = `${localX}px`;
          knob.style.top = `${localY}px`;
          knob.style.transform = "translate(-50%,-50%)";
          knob.classList.add("is-visible");
          return;
        }

        if (actionPointerId !== null) return;
        event.preventDefault();
        actionPointerId = event.pointerId;
        surface.setPointerCapture?.(event.pointerId);
        rightActionActive = true;
        itemTimer = window.setTimeout(() => {
          itemTimer = 0;
          rightActionActive = false;
          items.style.left =
            `${Math.max(8, Math.min(bounds.width - 140, localX - 150))}px`;
          items.style.top =
            `${Math.max(8, Math.min(bounds.height - 140, localY - 150))}px`;
          surface.classList.add("show-items");
        }, 420);
      });

      surface.addEventListener("pointermove", (event) => {
        if (event.pointerId !== joystickPointerId || !joystickOrigin) return;
        const dx = event.clientX - joystickOrigin.clientX;
        const dy = event.clientY - joystickOrigin.clientY;
        const distance = Math.hypot(dx, dy);
        const scale = Math.min(1, 54 / Math.max(distance, 1));
        knob.style.left = `${joystickOrigin.x + dx * scale}px`;
        knob.style.top = `${joystickOrigin.y + dy * scale}px`;
        if (distance < 10) return;
        heldDirection =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
        attemptMove(Date.now());
      });

      const stopSurfaceAction = (event) => {
        if (event.pointerId === joystickPointerId) {
          joystickPointerId = null;
          heldDirection = latestKeyboardDirection();
          hideTouchJoystick();
          if (heldDirection !== null) updateKeyboardJoystick(heldDirection);
          return;
        }
        if (event.pointerId !== actionPointerId) return;
        clearItemTimer();
        if (event.type === "pointerup" && rightActionActive) placeBomb();
        actionPointerId = null;
        rightActionActive = false;
      };
      surface.addEventListener("pointerup", stopSurfaceAction);
      surface.addEventListener("pointercancel", stopSurfaceAction);

      surface.querySelectorAll("[data-free-item]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (isDisabledUiControl(button)) return;
          useItem(button.dataset.freeItem);
          surface.classList.remove("show-items");
        });
      });
    }
    const cells = [];
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const cell = document.createElement("div");
      cell.className = "board-tile";
      cell.dataset.cell = String(index);
      board.append(cell);
      cells.push(cell);
    }
    const actors = document.createElement("div");
    actors.className = "actor-layer";
    board.append(actors);

    gameDom = {
      board,
      cells,
      actors,
      player: null,
      enemies: new Map(),
      lives: document.querySelector('[data-hud="lives"]'),
      time: document.querySelector('[data-hud="time"]'),
      enemyCount: document.querySelector('[data-hud="enemies"]'),
      message: document.querySelector("[data-message]"),
      range: document.querySelector('[data-stat="range"]'),
      capacity: document.querySelector('[data-stat="capacity"]'),
      speed: document.querySelector('[data-stat="speed"]'),
    };

    bindSettingsControls();
    document.querySelector('[data-action="help"]').addEventListener("click", showHelp);
    document.querySelector('[data-action="menu"]').addEventListener("click", renderMenu);
    document.querySelector('[data-action="bomb"]').addEventListener("click", placeBomb);

    for (const button of document.querySelectorAll("[data-item]")) {
      button.addEventListener("click", () => useItem(button.dataset.item));
    }
    for (const button of document.querySelectorAll("[data-dir]")) {
      const direction = Number(button.dataset.dir);
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        heldDirection = direction;
        attemptMove(Date.now());
      });
      button.addEventListener("pointerup", () => {
        if (heldDirection === direction) {
          heldDirection = latestKeyboardDirection();
          if (heldDirection !== null) updateKeyboardJoystick(heldDirection);
        }
      });
      button.addEventListener("pointercancel", () => {
        if (heldDirection === direction) {
          heldDirection = latestKeyboardDirection();
          if (heldDirection !== null) updateKeyboardJoystick(heldDirection);
        }
      });
    }
    const joystick = document.querySelector(".dpad");
    if (joystick) {
      joystick.insertAdjacentHTML("beforeend", '<span class="joystick-knob" aria-hidden="true"></span>');
      let dragging = false;
      const updateJoystick = (event) => {
        const rect = joystick.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        if (Math.hypot(dx, dy) < 10) return;
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
        const distance = Math.min(Math.hypot(dx, dy), rect.width * 0.32);
        const scale = distance / Math.max(Math.hypot(dx, dy), 1);
        joystick.querySelector(".joystick-knob").style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
        heldDirection = direction;
        attemptMove(Date.now());
      };
      joystick.addEventListener("pointerdown", (event) => { dragging = true; joystick.setPointerCapture?.(event.pointerId); event.preventDefault(); updateJoystick(event); });
      joystick.addEventListener("pointermove", (event) => { if (dragging) updateJoystick(event); });
      const stopJoystick = () => {
        dragging = false;
        heldDirection = latestKeyboardDirection();
        joystick.querySelector(".joystick-knob").style.transform =
          "translate(-50%,-50%)";
        if (heldDirection !== null) updateKeyboardJoystick(heldDirection);
      };
      joystick.addEventListener("pointerup", stopJoystick);
      joystick.addEventListener("pointercancel", stopJoystick);
      joystick.addEventListener("lostpointercapture", stopJoystick);
    }

    renderGame(true);
  }

  function itemButtonMarkup(kind, key, image) {
    return `
      <button class="item-button" data-item="${kind}" data-ui-sound="custom">
        <kbd>${key}</kbd><img src="${image}" alt="">
        <span>${ITEM_NAMES[kind]}</span><b data-count="${kind}">×0</b>
      </button>
    `;
  }

  function isWall(x, y) {
    return (
      x < 0 ||
      y < 0 ||
      x >= SIZE ||
      y >= SIZE ||
      STAGES[game.stageIndex].map[y][x] === "#"
    );
  }

  function hasBomb(x, y) {
    return game.bombs.some((bomb) => bomb.x === x && bomb.y === y);
  }

  function isWalkable(x, y, ignoreBombs = false) {
    if (isWall(x, y) || game.crates.has(keyOf(x, y))) return false;
    return ignoreBombs || !hasBomb(x, y);
  }

  function isTrapped(actor, now) {
    return actor.trappedUntil > now;
  }

  function movementDuration(actor, baseDuration, now) {
    return isTrapped(actor, now) ? baseDuration * 2 : baseDuration;
  }

  function updateHorizontalFacing(actor, horizontalMovement) {
    if (horizontalMovement < 0) actor.facing = "left";
    if (horizontalMovement > 0) actor.facing = "right";
  }

  function facingScale(actor) {
    return actor.facing === "left" ? "-1" : "1";
  }

  function bubbleContactOutcome(trappedActor, toucher) {
    return trappedActor.faction === toucher.faction ? "rescue" : "defeat";
  }

  function enterBubble(actor, until, now) {
    if (isTrapped(actor, now)) return false;
    actor.trappedUntil = until;
    return true;
  }

  function releaseFromBubble(actor) {
    actor.trappedUntil = 0;
    if ("hp" in actor && actor.hp <= 0) actor.hp = 1;
  }

  function attemptMove(now) {
    if (!game || game.status !== "playing" || heldDirection === null) return;
    if (now < nextPlayerMoveAt) return;
    const direction = DIRECTIONS[heldDirection];
    const x = game.player.x + direction.x;
    const y = game.player.y + direction.y;
    const baseMoveMs = game.player.turtleMounted ? TURTLE_MOVE_MS : PLAYER_MOVE_MS;
    const moveMs = movementDuration(game.player, baseMoveMs, now);
    nextPlayerMoveAt = now + moveMs;
    if (!isWalkable(x, y)) return;
    updateHorizontalFacing(game.player, direction.x);
    game.player.x = x;
    game.player.y = y;
    collectPickup();
    dirty = true;
  }

  function collectPickup() {
    const pickup = game.pickups.find(
      (item) => item.x === game.player.x && item.y === game.player.y,
    );
    if (!pickup) return;
    game.pickups = game.pickups.filter((item) => item.id !== pickup.id);
    if (pickup.kind === "range") game.player.range = Math.min(5, game.player.range + 1);
    if (pickup.kind === "capacity") {
      game.player.capacity = Math.min(5, game.player.capacity + 1);
    }
    if (["turtle", "needle", "shield"].includes(pickup.kind)) {
      game.inventory[pickup.kind] += 1;
    }
    playSoundEffect(itemPickupSound);
    game.message = `獲得：${ITEM_NAMES[pickup.kind]}`;
  }

  function placeBomb() {
    if (!game || game.status !== "playing") return;
    const now = Date.now();
    if (game.player.trappedUntil > now) {
      playSoundEffect(uiDisabledSound);
      game.message = "困在水泡中時不能放置水泡。";
      dirty = true;
      return;
    }
    if (game.bombs.length >= game.player.capacity) {
      playSoundEffect(uiDisabledSound);
      game.message = "氣囊已用完，等水泡爆開後再放置。";
      dirty = true;
      return;
    }
    if (hasBomb(game.player.x, game.player.y)) {
      playSoundEffect(uiDisabledSound);
      return;
    }
    game.bombs.push({
      id: `${now}-${game.player.x}-${game.player.y}`,
      x: game.player.x,
      y: game.player.y,
      explodeAt: now + BOMB_FUSE_MS,
    });
    playSoundEffect(uiInteractionSound);
    game.message = "水泡已放置，注意十字水柱。";
    dirty = true;
  }

  function useItem(kind) {
    if (!game || game.status !== "playing") return;
    if (game.inventory[kind] <= 0) {
      playSoundEffect(uiDisabledSound);
      return;
    }
    const now = Date.now();
    if (kind === "needle") {
      if (game.player.trappedUntil <= now) {
        playSoundEffect(uiDisabledSound);
        game.message = "目前不需要使用救援針。";
        dirty = true;
        return;
      }
      game.inventory.needle -= 1;
      game.player.trappedUntil = 0;
      playSoundEffect(rescueNeedleSound);
      game.message = "救援針刺破水泡，立刻脫困。";
    } else if (kind === "shield") {
      game.inventory.shield -= 1;
      game.player.trappedUntil = 0;
      game.player.shieldUntil = now + SHIELD_MS;
      playSoundEffect(crystalShieldSound);
      game.message = "水晶盾展開，獲得 3 秒防護。";
    } else if (kind === "turtle") {
      if (game.player.trappedUntil > now) {
        playSoundEffect(uiDisabledSound);
        game.message = "困泡時無法搭乘烏龜，請使用救援針或水晶盾。";
        dirty = true;
        return;
      }
      if (game.player.turtleMounted) {
        playSoundEffect(uiDisabledSound);
        game.message = "目前已騎乘極速烏龜。";
        dirty = true;
        return;
      }
      game.inventory.turtle -= 1;
      game.player.turtleMounted = true;
      playSoundEffect(speedTurtleSound);
      game.message = "搭乘極速烏龜：移速提升 20%，並可抵擋一次傷害。";
    }
    dirty = true;
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function pathDirection(enemy) {
    if (distanceSquared(enemy, game.player) > CHASE_DISTANCE * CHASE_DISTANCE) {
      return null;
    }
    const startKey = keyOf(enemy.x, enemy.y);
    const targetKey = keyOf(game.player.x, game.player.y);
    const seen = new Set([startKey]);
    const queue = [];
    for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex += 1) {
      const direction = DIRECTIONS[directionIndex];
      const x = enemy.x + direction.x;
      const y = enemy.y + direction.y;
      if (!isWalkable(x, y, true)) continue;
      seen.add(keyOf(x, y));
      queue.push({ x, y, first: directionIndex });
    }

    while (queue.length) {
      const current = queue.shift();
      if (keyOf(current.x, current.y) === targetKey) return current.first;
      for (const direction of DIRECTIONS) {
        const x = current.x + direction.x;
        const y = current.y + direction.y;
        const key = keyOf(x, y);
        if (seen.has(key) || !isWalkable(x, y, true)) continue;
        seen.add(key);
        queue.push({ x, y, first: current.first });
      }
    }
    return null;
  }

  function canEnemyMove(enemy, directionIndex, occupied) {
    const direction = DIRECTIONS[directionIndex];
    const x = enemy.x + direction.x;
    const y = enemy.y + direction.y;
    if (!isWalkable(x, y) || occupied.has(keyOf(x, y))) return null;
    return { x, y };
  }

  function moveEnemy(enemy, now, occupied) {
    if (now < enemy.nextMoveAt) return;
    occupied.delete(keyOf(enemy.x, enemy.y));
    const chase = pathDirection(enemy);
    const turn = [...enemy.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2
      ? 1
      : -1;
    const patrol = Array.from(
      { length: DIRECTIONS.length },
      (_, index) =>
        (enemy.patrolDirection + turn * index + DIRECTIONS.length) %
        DIRECTIONS.length,
    );
    let candidates = chase === null ? patrol : [chase];

    const firstDirection = candidates[0];
    if (firstDirection !== undefined) {
      const next = DIRECTIONS[firstDirection];
      if (hasBomb(enemy.x + next.x, enemy.y + next.y)) {
        candidates = DIRECTIONS.map((_, index) => index)
          .filter((index) => {
            const direction = DIRECTIONS[index];
            return !hasBomb(enemy.x + direction.x, enemy.y + direction.y);
          })
          .sort((a, b) => {
            const pointA = {
              x: enemy.x + DIRECTIONS[a].x,
              y: enemy.y + DIRECTIONS[a].y,
            };
            const pointB = {
              x: enemy.x + DIRECTIONS[b].x,
              y: enemy.y + DIRECTIONS[b].y,
            };
            return distanceSquared(pointB, game.player) - distanceSquared(pointA, game.player);
          });
      }
    }

    let moved = false;
    for (const directionIndex of candidates) {
      const next = canEnemyMove(enemy, directionIndex, occupied);
      if (!next) continue;
      updateHorizontalFacing(enemy, DIRECTIONS[directionIndex].x);
      enemy.x = next.x;
      enemy.y = next.y;
      if (chase === null) enemy.patrolDirection = directionIndex;
      moved = true;
      break;
    }
    if (!moved && chase === null) {
      enemy.patrolDirection =
        (enemy.patrolDirection + turn + DIRECTIONS.length) % DIRECTIONS.length;
    }
    enemy.nextMoveAt = now + movementDuration(enemy, ENEMY_MOVE_MS, now);
    occupied.add(keyOf(enemy.x, enemy.y));
    dirty = true;
  }

  function blastCells(bomb) {
    const cells = [{ x: bomb.x, y: bomb.y }];
    for (const direction of DIRECTIONS) {
      for (let distance = 1; distance <= game.player.range; distance += 1) {
        const x = bomb.x + direction.x * distance;
        const y = bomb.y + direction.y * distance;
        if (isWall(x, y)) break;
        cells.push({ x, y });
        if (game.crates.has(keyOf(x, y))) break;
      }
    }
    return cells;
  }

  function pickupFor(x, y) {
    const roll = (game.stageIndex * 17 + x * 11 + y * 7) % 10;
    return ["turtle", "needle", "shield", "range", "capacity"][roll] ?? null;
  }

  function explodeBomb(bomb, now, exploded = new Set()) {
    if (exploded.has(bomb.id)) return;
    exploded.add(bomb.id);
    playSoundEffect(waterBallExplosionSound);
    game.bombs = game.bombs.filter((candidate) => candidate.id !== bomb.id);
    const cells = blastCells(bomb);
    const cellKeys = new Set(cells.map((cell) => keyOf(cell.x, cell.y)));

    for (const chained of [...game.bombs]) {
      if (cellKeys.has(keyOf(chained.x, chained.y))) {
        explodeBomb(chained, now, exploded);
      }
    }

    for (const cell of cells) {
      const key = keyOf(cell.x, cell.y);
      game.blasts.push({ id: `${bomb.id}-${key}`, x: cell.x, y: cell.y, until: now + BLAST_MS });
      if (game.crates.delete(key)) {
        const kind = pickupFor(cell.x, cell.y);
        if (kind) {
          game.pickups.push({
            id: `${game.stageIndex}-${key}-${kind}`,
            x: cell.x,
            y: cell.y,
            kind,
          });
        }
      }
    }

    let enemyEnteredBubble = false;
    for (const enemy of game.enemies) {
      if (!cellKeys.has(keyOf(enemy.x, enemy.y)) || isTrapped(enemy, now)) {
        continue;
      }
      enemy.hp = Math.max(0, enemy.hp - 1);
      if (enemy.hp === 0 && enterBubble(enemy, Infinity, now)) {
        enemyEnteredBubble = true;
      }
    }
    if (enemyEnteredBubble) playSoundEffect(bubbleTrapSound);
    game.message = "十字水柱爆發！";
    dirty = true;
  }

  function trapPlayer(now, source) {
    if (game.player.shieldUntil > now) return;
    if (game.player.turtleMounted) {
      game.player.turtleMounted = false;
      game.message = "極速烏龜擋下這次傷害，角色沒有困泡或扣命。";
      dirty = true;
      return;
    }
    if (!enterBubble(game.player, now + TRAP_MS, now)) return;
    playSoundEffect(bubbleTrapSound);
    game.message =
      source === "enemy"
        ? "被困進水泡！仍可移動，快甩開敵人或使用救援道具。"
        : "被水柱困住 2 秒，期間仍可移動但不能放水泡。";
    dirty = true;
  }

  function respawn(now) {
    game.player.lives -= 1;
    game.player.x = game.player.spawnX;
    game.player.y = game.player.spawnY;
    game.player.trappedUntil = 0;
    game.player.shieldUntil = now + RESPAWN_SHIELD_MS;
    lastEnemyContacts = new Set();
    lastBlastContact = false;
    if (game.player.lives <= 0) {
      game.status = "game-over";
      game.message = "任務失敗。";
      showResult(false);
    } else {
      game.message = "損失 1 條命，已返回出生點並獲得 2 秒防護。";
    }
    dirty = true;
  }

  function handleHazards(now) {
    const touchingEnemies = game.enemies.filter(
      (enemy) => enemy.x === game.player.x && enemy.y === game.player.y,
    );
    const trappedEnemies = touchingEnemies.filter((enemy) => isTrapped(enemy, now));
    const defeatedEnemyIds = new Set();
    let playerBubblePopped = false;

    for (const enemy of trappedEnemies) {
      const outcome = bubbleContactOutcome(enemy, game.player);
      if (outcome === "rescue") {
        releaseFromBubble(enemy);
        continue;
      }
      defeatedEnemyIds.add(enemy.id);
      if (
        isTrapped(game.player, now) &&
        bubbleContactOutcome(game.player, enemy) === "defeat"
      ) {
        playerBubblePopped = true;
      }
    }

    if (defeatedEnemyIds.size) {
      game.enemies = game.enemies.filter(
        (enemy) => !defeatedEnemyIds.has(enemy.id),
      );
      playSoundEffect(bubblePopSound);
      game.message = "敵方泡泡被撞破，威脅已解除！";
      dirty = true;
    }

    if (playerBubblePopped) {
      respawn(now);
      return;
    }

    const contacts = new Set(
      game.enemies
        .filter(
          (enemy) =>
            !isTrapped(enemy, now) &&
            enemy.faction !== game.player.faction &&
            enemy.x === game.player.x &&
            enemy.y === game.player.y,
        )
        .map((enemy) => enemy.id),
    );
    const newEnemyContact = [...contacts].some((id) => !lastEnemyContacts.has(id));
    const onBlast = game.blasts.some(
      (blast) => blast.x === game.player.x && blast.y === game.player.y,
    );

    if (game.player.shieldUntil <= now) {
      if (isTrapped(game.player, now) && newEnemyContact) {
        playSoundEffect(bubblePopSound);
        respawn(now);
      } else if (!isTrapped(game.player, now) && newEnemyContact) {
        trapPlayer(now, "enemy");
      } else if (!isTrapped(game.player, now) && onBlast && !lastBlastContact) {
        trapPlayer(now, "blast");
      }
    }

    lastEnemyContacts = contacts;
    lastBlastContact = onBlast;
  }

  function finishStage() {
    if (!game || game.status !== "playing") return;
    game.status = "stage-clear";
    playSoundEffect(stageVictoryFanfareSound);
    const elapsed = Date.now() - game.startedAt;
    game.stageTimes[game.stageIndex] = elapsed;
    const cleared = Math.max(highestCleared(), game.stageIndex);
    safeStorage.set(STORAGE.cleared, String(cleared));
    const best = bestTimes();
    if (!best[game.stageIndex] || elapsed < best[game.stageIndex]) {
      best[game.stageIndex] = elapsed;
      safeStorage.set(STORAGE.best, JSON.stringify(best));
    }
    showResult(true, elapsed);
  }

  function showResultCgSequence(entry, onDismiss) {
    closeModal();
    document.body.classList.add("cg-overlay-open");
    const overlay = document.createElement("div");
    overlay.className = "cg-unlock-overlay is-video";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "CG 解鎖演出");
    overlay.tabIndex = -1;
    overlay.innerHTML = `
      <video
        class="cg-unlock-video"
        src="${entry.video}"
        muted
        autoplay
        playsinline
        preload="auto"
      ></video>
      <div class="cg-unlock-loading"><i></i><span>CG LOADING</span></div>
      <div class="cg-photo-stage" aria-hidden="true">
        <figure class="cg-photo-frame">
          <img src="${entry.image}" alt="">
        </figure>
        <div class="cg-unlock-notice">
          <span>COLLECTION UPDATED</span>
          <strong>CG 已解鎖</strong>
          <small>點擊畫面任意位置繼續</small>
        </div>
      </div>
      <div class="cg-capture-flash" aria-hidden="true"></div>
    `;
    const video = overlay.querySelector("video");
    let phase = "video";
    let captureStarted = false;

    const beginCapture = () => {
      if (captureStarted) return;
      captureStarted = true;
      overlay.classList.add("is-flashing");
      if (cgShutterSound) playSoundEffect(cgShutterSound);
      window.setTimeout(() => {
        video.pause();
        unlockCg(entry);
        phase = "photo";
        overlay.classList.remove("is-video");
        overlay.classList.add("is-photo");
        overlay.querySelector(".cg-photo-stage")?.setAttribute("aria-hidden", "false");
        overlay.focus({ preventScroll: true });
      }, CG_FLASH_REVEAL_MS);
      window.setTimeout(
        () => overlay.classList.remove("is-flashing"),
        CG_FLASH_END_MS,
      );
    };

    const dismiss = (event) => {
      if (phase !== "photo") return;
      event?.preventDefault();
      event?.stopPropagation();
      phase = "closed";
      video.pause();
      overlay.remove();
      document.body.classList.remove("cg-overlay-open");
      onDismiss();
    };

    video.addEventListener("playing", () => overlay.classList.add("has-started"));
    video.addEventListener("ended", beginCapture, { once: true });
    video.addEventListener("error", beginCapture, { once: true });
    overlay.addEventListener("click", dismiss);
    overlay.addEventListener("keydown", (event) => {
      if (["Enter", " ", "Escape"].includes(event.key)) dismiss(event);
    });
    document.body.append(overlay);
    video.play().catch(() => {
      overlay.classList.add("needs-play");
      const loadingLabel = overlay.querySelector(".cg-unlock-loading span");
      if (loadingLabel) loadingLabel.textContent = "點擊畫面開始播放";
      const resume = () => {
        video.play().then(() => overlay.classList.remove("needs-play")).catch(beginCapture);
      };
      overlay.addEventListener("pointerdown", resume, { once: true });
    });
  }

  function showResult(success, elapsed = Date.now() - game.startedAt) {
    const entry = cgEntry(
      selectedCharacter,
      game.stageIndex,
      success ? "victory" : "defeat",
    );
    if (cgModeEnabled) {
      showResultCgSequence(entry, () => showResultModal(success, elapsed));
      return;
    }
    showResultModal(success, elapsed);
  }

  function showResultModal(success, elapsed) {
    const stage = STAGES[game.stageIndex];
    const score = Math.max(
      1000,
      12000 - Math.floor(elapsed / 100) + game.player.lives * 750,
    );
    const canContinue = success && game.stageIndex < STAGES.length - 1;
    showModal(`
      <section class="result-card" data-modal-static role="dialog" aria-modal="true">
        <div class="rank-medal${success ? "" : " failed"}">${success ? "S" : "×"}</div>
        <span class="panel-label">${success ? "AREA CLEARED" : "MISSION FAILED"}</span>
        <h2>${success ? stage.name : "救援行動中止"}</h2>
        <p class="result-copy">${success ? "道路已清出，下一個區域可以進入。" : "生命歸零。重新整備後再出發。"}</p>
        <div class="score-sheet">
          <div><span>任務時間</span><strong>${formatTime(elapsed)}</strong></div>
          <div><span>剩餘生命</span><strong>${Math.max(0, game.player.lives)}</strong></div>
          <div class="total-line"><span>得分</span><strong>${score.toLocaleString()}</strong></div>
        </div>
        <div class="result-actions">
          ${canContinue ? '<button class="primary-button compact" data-result="next">下一區域</button>' : ""}
          <button class="secondary-button" data-result="retry">重新挑戰</button>
          <button class="secondary-button" data-result="menu">返回首頁</button>
        </div>
      </section>
    `);

    document.querySelector('[data-result="next"]')?.addEventListener("click", () => {
      const carry = { player: game.player, inventory: game.inventory, stageTimes: game.stageTimes };
      startStage(game.stageIndex + 1, carry);
    });
    document.querySelector('[data-result="retry"]').addEventListener("click", () => {
      startStage(game.stageIndex);
    });
    document.querySelector('[data-result="menu"]').addEventListener("click", renderMenu);
  }

  function renderCell(x, y) {
    const index = y * SIZE + x;
    const cell = gameDom.cells[index];
    const key = keyOf(x, y);
    let content = "";
    const tileDepth = y * 100;
    if (isWall(x, y)) {
      const wall = STAGES[game.stageIndex].floor === "garden" ? SPRITES.hedge : SPRITES.stone;
      content += `<img class="tile-object wall-object" style="z-index:${tileDepth + 10}" src="${wall}" alt="">`;
    } else if (game.crates.has(key)) {
      content += `<img class="tile-object crate-object" style="z-index:${tileDepth + 10}" src="${SPRITES.crate}" alt="">`;
    }
    const pickup = game.pickups.find((item) => item.x === x && item.y === y);
    if (pickup) {
      const pickupPhase = Date.now() % 1800;
      if (pickup.kind === "range" || pickup.kind === "capacity") {
        const symbol = pickup.kind === "range" ? SPRITES.rangeArrow : SPRITES.capacityPlus;
        content += `<span class="pickup pickup-upgrade" style="z-index:${tileDepth + 30};animation-delay:-${pickupPhase}ms"><img class="pickup-base" src="${SPRITES.balloon}" alt=""><img class="pickup-symbol" src="${symbol}" alt=""></span>`;
      } else {
        const image =
          pickup.kind === "needle"
            ? SPRITES.needle
            : pickup.kind === "shield"
              ? SPRITES.shield
              : SPRITES.turtleBadge;
        content += `<span class="pickup" style="z-index:${tileDepth + 30};animation-delay:-${pickupPhase}ms"><img src="${image}" alt=""></span>`;
      }
    }
    if (hasBomb(x, y)) {
      const bombPhase = Date.now() % 1500;
      content += `<img class="entity bomb-entity" style="z-index:${tileDepth + 25};animation-delay:-${bombPhase}ms" src="${SPRITES.balloon}" alt="">`;
    }
    if (game.blasts.some((blast) => blast.x === x && blast.y === y)) {
      content += '<span class="water-blast">✦</span>';
    }
    cell.innerHTML = content;
  }

  function positionActor(element, x, y, duration) {
    element.style.left = `${((x + 0.5) / SIZE) * 100}%`;
    element.style.top = `${((y + 0.5) / SIZE) * 100}%`;
    element.style.transitionDuration = `${duration}ms`;
  }

  function updateActors(now) {
    if (!gameDom.player) {
      const player = document.createElement("div");
      player.className = "player-wrap";
      player.innerHTML = `<img class="entity player-entity" src="${selectedSprite().image}" alt="${selectedCharacter}">`;
      gameDom.actors.append(player);
      gameDom.player = player;
    }
    gameDom.player.style.setProperty("--actor-facing-x", facingScale(game.player));
    gameDom.player.style.zIndex = String(game.player.y * 100 + 20);
    positionActor(
      gameDom.player,
      game.player.x,
      game.player.y,
      movementDuration(
        game.player,
        game.player.turtleMounted ? TURTLE_MOVE_MS : PLAYER_MOVE_MS,
        now,
      ),
    );
    gameDom.player.classList.toggle("is-trapped", isTrapped(game.player, now));
    gameDom.player.querySelector(".player-entity").src = selectedSprite().image;
    gameDom.player.querySelector(".player-entity").alt = selectedCharacter;
    gameDom.player.querySelectorAll("[data-effect]").forEach((effect) => effect.remove());
    if (game.player.turtleMounted) {
      gameDom.player.insertAdjacentHTML(
        "beforeend",
        `<img class="mount-entity" data-effect src="${SPRITES.turtle}" alt="">`,
      );
    }
    if (game.player.trappedUntil > now) {
      gameDom.player.insertAdjacentHTML(
        "beforeend",
        '<span class="trap-bubble" data-effect></span>',
      );
    }
    if (game.player.shieldUntil > now) {
      gameDom.player.insertAdjacentHTML(
        "beforeend",
        '<span class="shield-ring" data-effect></span>',
      );
    }

    const activeIds = new Set();
    for (const enemy of game.enemies) {
      activeIds.add(enemy.id);
      let element = gameDom.enemies.get(enemy.id);
      if (!element) {
        element = document.createElement("div");
        element.className = `enemy-wrap${enemy.kind === "pirate" ? " enemy-pirate" : ""}`;
        element.innerHTML = `<img class="entity enemy-entity" src="${SPRITES[enemy.kind]}" alt="">`;
        gameDom.actors.append(element);
        gameDom.enemies.set(enemy.id, element);
      }
      element.style.setProperty("--actor-facing-x", facingScale(enemy));
      element.style.zIndex = String(enemy.y * 100 + 20);
      positionActor(
        element,
        enemy.x,
        enemy.y,
        movementDuration(enemy, ENEMY_MOVE_MS, now),
      );
      element.classList.toggle("is-trapped", isTrapped(enemy, now));
      element.querySelectorAll("[data-effect]").forEach((effect) => effect.remove());
      if (isTrapped(enemy, now)) {
        element.insertAdjacentHTML(
          "beforeend",
          '<span class="trap-bubble" data-effect></span>',
        );
      }
      if (enemy.kind === "pirate") {
        const health = Array.from(
          { length: 3 },
          (_, index) => `<i class="${index < enemy.hp ? "active" : ""}"></i>`,
        ).join("");
        element.querySelector(".boss-health")?.remove();
        element.insertAdjacentHTML(
          "beforeend",
          `<span class="boss-health">${health}</span>`,
        );
      }
    }
    for (const [id, element] of gameDom.enemies) {
      if (activeIds.has(id)) continue;
      element.remove();
      gameDom.enemies.delete(id);
    }
  }

  function renderGame(force = false) {
    if (!game || !gameDom) return;
    const now = Date.now();
    if (force || dirty) {
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) renderCell(x, y);
      }
      updateActors(now);
      gameDom.lives.textContent = "♥".repeat(Math.max(0, game.player.lives));
      gameDom.enemyCount.textContent = String(game.enemies.length);
      gameDom.message.textContent = window.GameI18n
        ? window.GameI18n.translate(game.message)
        : game.message;
      gameDom.range.textContent = String(game.player.range);
      gameDom.capacity.textContent = String(game.player.capacity);
      gameDom.speed.textContent = isTrapped(game.player, now)
        ? "-50%"
        : game.player.turtleMounted
          ? "+20%"
          : "NORMAL";
      for (const kind of ["turtle", "needle", "shield"]) {
        const buttons = document.querySelectorAll(
          `[data-item="${kind}"],[data-free-item="${kind}"]`,
        );
        const count = document.querySelector(`[data-count="${kind}"]`);
        const unavailable = game.inventory[kind] <= 0;
        for (const button of buttons) {
          button.setAttribute("aria-disabled", String(unavailable));
          button.classList.toggle(
            "active",
            (kind === "shield" && game.player.shieldUntil > now) ||
              (kind === "turtle" && game.player.turtleMounted),
          );
        }
        if (count) count.textContent = `×${game.inventory[kind]}`;
      }
      dirty = false;
    }
    gameDom.time.textContent = formatTime(now - game.startedAt);
    lastRenderAt = now;
  }

  function tick() {
    if (!game || !gameDom || game.status !== "playing") return;
    const now = Date.now();
    game.now = now;

    if (game.player.trappedUntil && game.player.trappedUntil <= now) {
      game.player.trappedUntil = 0;
      game.message = "水泡自行消散，無傷復原。";
      dirty = true;
    }
    attemptMove(now);

    const occupied = new Set(game.enemies.map((enemy) => keyOf(enemy.x, enemy.y)));
    for (const enemy of game.enemies) moveEnemy(enemy, now, occupied);

    for (const bomb of [...game.bombs]) {
      if (bomb.explodeAt <= now) explodeBomb(bomb, now);
    }
    const blastCount = game.blasts.length;
    game.blasts = game.blasts.filter((blast) => blast.until > now);
    if (blastCount !== game.blasts.length) dirty = true;

    handleHazards(now);
    if (game.status === "playing" && game.enemies.length === 0) finishStage();
    if (dirty || now - lastRenderAt >= 100) renderGame();
    frameId = requestAnimationFrame(tick);
  }

  function startLoop() {
    stopLoop();
    frameId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function directionFromKey(key) {
    const normalized = key.toLowerCase();
    if (normalized === "arrowup" || normalized === "w") return 0;
    if (normalized === "arrowright" || normalized === "d") return 1;
    if (normalized === "arrowdown" || normalized === "s") return 2;
    if (normalized === "arrowleft" || normalized === "a") return 3;
    return null;
  }

  function latestKeyboardDirection() {
    const directions = [...heldMovementKeys.values()];
    return directions.at(-1) ?? null;
  }

  function updateKeyboardJoystick(direction) {
    const surface = document.querySelector(".mobile-touch-surface");
    const knob = surface?.querySelector(".free-joystick");
    if (!surface || !knob) return;

    let ring = surface.querySelector(".keyboard-joystick-ring");
    if (!ring) {
      ring = document.createElement("span");
      ring.className = "keyboard-joystick-ring";
      surface.append(ring);
    }

    const bounds = surface.getBoundingClientRect();
    const x = 150 - bounds.left;
    const y = Math.max(100, innerHeight - 220 - bounds.top);
    const offsets = [
      { x: 0, y: -42 },
      { x: 42, y: 0 },
      { x: 0, y: 42 },
      { x: -42, y: 0 },
    ];
    const offset = offsets[direction];
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    knob.style.left = `${x}px`;
    knob.style.top = `${y}px`;
    knob.style.transform =
      `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`;
    knob.classList.add("is-visible");
  }

  function hideKeyboardJoystick() {
    const surface = document.querySelector(".mobile-touch-surface");
    if (!surface) return;
    surface.querySelector(".keyboard-joystick-ring")?.remove();
    if (surface.querySelector(".free-joystick-ring")) return;
    const knob = surface.querySelector(".free-joystick");
    knob?.classList.remove("is-visible");
    if (knob) knob.style.transform = "translate(-50%,-50%)";
  }

  window.addEventListener(
    "keydown",
    (event) => {
      trackCheat(event);
    },
    true,
  );

  window.addEventListener("keydown", (event) => {
    if (!game || game.status !== "playing") return;
    const direction = directionFromKey(event.key);
    if (direction !== null) {
      event.preventDefault();
      heldMovementKeys.set(event.key.toLowerCase(), direction);
      heldDirection = direction;
      updateKeyboardJoystick(direction);
      attemptMove(Date.now());
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) placeBomb();
    } else if (event.key === "1" && !event.repeat) {
      useItem("turtle");
    } else if (event.key === "2" && !event.repeat) {
      useItem("needle");
    } else if (event.key === "3" && !event.repeat) {
      useItem("shield");
    }
  });

  window.addEventListener("keyup", (event) => {
    const direction = directionFromKey(event.key);
    if (direction === null) return;
    heldMovementKeys.delete(event.key.toLowerCase());
    heldDirection = latestKeyboardDirection();
    if (heldDirection === null) {
      hideKeyboardJoystick();
    } else {
      updateKeyboardJoystick(heldDirection);
    }
  });

  window.addEventListener("blur", () => {
    heldMovementKeys.clear();
    heldDirection = null;
    hideKeyboardJoystick();
  });

  armMusicActivation();
  armUiSoundFeedback();
  applyCgModeState();
  installTouchKonamiPad(trackCheatKey);

  renderMenu();

})();
