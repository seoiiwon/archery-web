import { CONFIG } from "../game/config";
import { BowController } from "../game/BowController";
import type { GameManager } from "../game/GameManager";
import type { Shot } from "../game/ScoreManager";
import type { AudioManager } from "../game/AudioManager";
import type { RangeRenderer } from "../render/RangeRenderer";
import { targetCanvas } from "../render/SceneBuilder";
import { icon } from "./icons";
const pad = (n: number, size = 2) => String(n).padStart(size, "0");
export class UIManager {
  readonly canvas: HTMLCanvasElement;
  private modal: HTMLElement;
  private modalKind = "";
  private target: HTMLCanvasElement;
  private targetFace = targetCanvas(400);
  private lastPhase = "";
  sensitivity = 1;
  private hitTimer = 0;
  private lastShotCount = -1;
  private els: Record<string, HTMLElement> = {};
  constructor(
    readonly root: HTMLElement,
    readonly game: GameManager,
    readonly audio: AudioManager,
  ) {
    root.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#" aria-label="Stillpoint 홈">${icon("target")}<span>STILLPOINT<small>ARCHERY, IN THE ELEMENTS.</small></span></a>
        <div class="range-name"><span class="live-dot"></span>PINE RIDGE <span class="range-divider">/</span> <span>OUTDOOR RANGE</span></div>
        <nav class="toolbar" aria-label="게임 메뉴"><button id="sound-btn" class="icon-button" aria-label="음소거" title="소리 켜기/끄기 · M">${icon("sound")}</button><button id="settings-btn" class="icon-button" aria-label="설정" title="설정">${icon("settings")}</button><span class="tool-divider"></span><button id="score-btn" class="text-button">${icon("chart")}<span>경기 기록</span></button></nav>
      </header>
      <main id="game-stage" class="game-stage">
        <canvas id="range-canvas" aria-label="3D 양궁 경기장. 마우스 왼쪽 버튼을 누른 채 조준하고 놓아서 발사합니다." tabindex="0"></canvas>
        <div class="scene-vignette"></div>
        <div class="range-caption"><div class="eyebrow">A MOMENT OF FOCUS</div><h1>바람을 읽고.<br><em>한 발에 집중하세요.</em></h1><p>리커브 70m <span>·</span> 122cm 타깃</p></div>
        <section class="weather-card" aria-label="현재 기상"><div class="weather-heading"><span id="weather-icon">${icon("sun")}</span><div><strong id="weather-label">맑음</strong><small id="weather-english">Clear skies</small></div><span id="temperature">21°</span></div><div class="weather-wind">${icon("wind")}<strong><span id="wind-speed">0.0</span><small> m/s</small></strong><span id="wind-description">측풍</span><span class="wind-direction" id="wind-arrow">↑</span></div><div class="gust-row"><span class="live-dot"></span><span id="gust-label">실시간 풍속</span><span>AUTO WEATHER</span></div></section>
        <div class="lane-marker" id="lane-marker"><span>TARGET 02</span><strong>70<span> m</span></strong><i></i></div>
        <div class="sight" id="sight"><span></span><i></i><b></b></div>
        <div class="state-pill" id="state-pill"><span class="live-dot"></span><span id="phase-label">사대 준비</span></div>
        <div class="shot-result" id="shot-result" role="status" aria-live="polite"><span id="hit-eyebrow">ON TARGET</span><strong id="hit-score">10</strong><span id="hit-description">중심을 꿰뚫는 한 발</span></div>
        <div class="interaction-hint" id="interaction-hint">${icon("mouse")}<span><strong>누르고</strong> 당기기 <i>—</i> 움직여 조준 <i>—</i> <strong>놓아서</strong> 발사</span></div>
        <div class="focus-info" id="focus-info"><span>70m 영점 조준기</span><span>ESC 당기기 취소</span></div>
        <div class="bottom-hud">
          <section class="match-card"><div class="card-kicker">QUALIFICATION <span>SOLO</span></div><div class="match-numbers"><div><span class="label">END</span><strong><span id="end-number">01</span><small> / 12</small></strong></div><div><span class="label">ARROW</span><strong><span id="arrow-number">01</span><small> / 06</small></strong></div></div><div class="arrow-dots" id="arrow-dots"></div></section>
          <section class="score-card"><span class="label">TOTAL SCORE</span><div class="total-score"><strong id="total-score">000</strong><span>/ 720</span></div><div class="score-meta"><span>이번 엔드 <b id="end-score">0</b><small> / 60</small></span><span>남은 화살 <b id="remaining">72</b></span></div></section>
          <section class="draw-card"><div class="draw-header"><span class="label">DRAW & RELEASE</span><span id="draw-status">호흡을 고르고 준비하세요</span></div><div class="draw-meter"><div id="draw-fill"></div><span></span></div><div class="draw-meta"><span><b id="draw-percent">0</b><small> %</small></span><div><span id="draw-force">0.0</span> lb <i>·</i> <span id="draw-length">0</span> cm <i>·</i> <span id="hold-time">0.0</span> s</div></div><div class="draw-footer"><span>44 lb RECURVE</span><span>24 g CARBON ARROW</span></div></section>
          <section class="target-card"><canvas id="target-map" width="320" height="320" aria-label="이번 엔드의 명중 위치"></canvas><div class="target-meta"><span class="label">LAST SHOT</span><strong id="last-shot">—</strong><span id="last-position">첫 화살을 기다립니다</span><span id="last-flight">정밀 명중 기록</span></div></section>
        </div>
        <footer class="game-footer"><span><i class="live-dot"></i> LIVE RANGE <span class="footer-sep">/</span> <span id="footer-status">바람은 매 엔드 달라집니다.</span></span><div><button id="reset-aim" title="조준 원점 · R">${icon("reset")} 조준 초기화 <kbd>R</kbd></button><button id="help-btn">${icon("help")} 조작 안내</button><button id="fullscreen-btn" aria-label="전체 화면">${icon("expand")}</button></div></footer>
        <div class="loading" id="loading"><div class="loading-mark">${icon("target")}</div><strong>STILLPOINT</strong><span>경기장의 공기를 담는 중</span></div>
      </main>
      <div class="modal-backdrop" id="modal-backdrop" hidden><section class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div>
      <div class="toast" id="toast" role="status"></div>`;
    this.canvas = root.querySelector("#range-canvas")!;
    this.modal = root.querySelector("#modal")!;
    this.target = root.querySelector("#target-map")!;
    root
      .querySelectorAll<HTMLElement>("[id]")
      .forEach((el) => (this.els[el.id] = el));
    this.bind();
    this.weather();
    this.drawTarget();
    game.addEventListener("impact", () => {
      this.hitTimer = 2.2;
      this.refreshScore();
      this.showHit();
    });
    game.addEventListener("phase", () => {
      if (game.phase === "end") this.showEnd();
      if (game.phase === "finished") this.showScore(true);
    });
    game.addEventListener("restart", () => {
      this.weather();
      this.lastShotCount = -1;
      this.hitTimer = 0;
      this.refreshScore();
    });
    game.addEventListener("nextend", () => {
      this.lastShotCount = -1;
      this.refreshScore();
    });
  }
  ready() {
    this.els.loading.classList.add("loaded");
    setTimeout(() => this.els.loading.remove(), 600);
  }
  private text(id: string, value: string | number) {
    this.els[id].textContent = String(value);
  }
  private bind() {
    this.els["sound-btn"].onclick = () => {
      void this.audio.start(this.game.weather.current);
      this.audio.toggle();
      this.updateSound();
    };
    this.els["settings-btn"].onclick = () => this.showSettings();
    this.els["score-btn"].onclick = () => this.showScore();
    this.els["help-btn"].onclick = () => this.showHelp();
    this.els["reset-aim"].onclick = () => {
      this.game.player.bow.resetAim();
      this.toast("70m 영점으로 조준을 초기화했습니다");
    };
    this.els["fullscreen-btn"].onclick = () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else
        void document.documentElement
          .requestFullscreen()
          .catch(() =>
            this.toast("이 브라우저에서는 전체 화면을 사용할 수 없습니다."),
          );
    };
    this.root.querySelector(".brand")!.addEventListener("click", (e) => {
      e.preventDefault();
      this.showHelp();
    });
    this.els["modal-backdrop"].addEventListener("click", (e) => {
      if (
        e.target === this.els["modal-backdrop"] &&
        this.modalKind !== "end" &&
        this.modalKind !== "finished"
      )
        this.closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (
          this.modalKind &&
          this.modalKind !== "end" &&
          this.modalKind !== "finished"
        )
          this.closeModal();
        else this.game.cancelDraw();
      }
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "m") {
        this.audio.toggle();
        this.updateSound();
      }
      if (
        e.key.toLowerCase() === "r" &&
        !this.modalKind &&
        this.game.phase === "ready"
      ) {
        this.game.player.bow.resetAim();
        this.toast("조준 초기화");
      }
      if (e.key === "Tab" && this.modalKind) {
        const elements = Array.from(
          this.modal.querySelectorAll<HTMLElement>("button,input,a"),
        );
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    });
  }
  updateSound() {
    this.els["sound-btn"].innerHTML = icon(
      this.audio.muted ? "muted" : "sound",
    );
    this.els["sound-btn"].setAttribute(
      "aria-label",
      this.audio.muted ? "소리 켜기" : "음소거",
    );
    this.els["sound-btn"].setAttribute(
      "aria-pressed",
      String(this.audio.muted),
    );
  }
  private weather() {
    const w = this.game.weather.current;
    this.text("weather-label", w.label);
    this.text("weather-english", w.english);
    this.text("temperature", `${w.temperature}°`);
    this.els["weather-icon"].innerHTML = icon(
      {
        clear: "sun",
        cloudy: "cloud",
        rain: "rain",
        fog: "fog",
        windy: "wind",
        sunset: "sun",
      }[w.kind],
    );
  }
  update(dt: number) {
    const game = this.game,
      bow = game.player.bow,
      w = game.wind.sample(game.time);
    const speed = w.length();
    this.text("wind-speed", speed.toFixed(1));
    this.els["wind-arrow"].style.transform =
      `rotate(${(Math.atan2(w.x, -w.z) * 180) / Math.PI}deg)`;
    this.text(
      "wind-description",
      Math.abs(w.x) > Math.abs(w.z)
        ? w.x > 0
          ? "우향 측풍"
          : "좌향 측풍"
        : w.z > 0
          ? "맞바람"
          : "뒷바람",
    );
    this.text(
      "gust-label",
      game.wind.gusty ? "돌풍 · 변동 중" : "안정적인 바람",
    );
    if (this.lastPhase !== game.phase) {
      this.lastPhase = game.phase;
      this.root.dataset.phase = game.phase;
      this.text(
        "phase-label",
        {
          ready: "사대 준비",
          drawing: "조준 중",
          flight: "화살 비행 중",
          impact: "명중 확인",
          end: "엔드 완료",
          finished: "경기 완료",
        }[game.phase],
      );
      this.refreshScore();
    }
    this.text("draw-percent", Math.round(bow.draw * 100));
    this.text("draw-force", (bow.force / 4.44822).toFixed(1));
    this.text(
      "draw-length",
      Math.round(bow.draw * CONFIG.bow.maxDrawLength * 100),
    );
    this.text("hold-time", bow.elapsed.toFixed(1));
    this.els["draw-fill"].style.width = `${bow.draw * 100}%`;
    this.els["draw-card"]?.classList.toggle("fatigued", bow.fatigue > 0.1);
    const tired = bow.fatigue > 0.1;
    this.els["draw-fill"].classList.toggle("fatigued", tired);
    this.text(
      "draw-status",
      game.phase === "drawing"
        ? tired
          ? "근육 피로 · 흔들림 증가"
          : bow.draw > 0.98
            ? "완전 인장 · 천천히 놓으세요"
            : "부드럽게 당기는 중"
        : game.phase === "flight"
          ? "탄도를 따라가는 중"
          : "호흡을 고르고 준비하세요",
    );
    this.text(
      "footer-status",
      game.phase === "drawing"
        ? `예상 초속 ${BowController.speed(bow.draw).toFixed(1)} m/s · 바람을 고려해 조준하세요`
        : "바람은 매 엔드 달라집니다.",
    );
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      this.els["shot-result"].classList.add("visible");
    } else this.els["shot-result"].classList.remove("visible");
  }
  private refreshScore() {
    const g = this.game,
      p = g.scores.get(g.activePlayerId),
      shots = p.ends[g.end],
      count = g.scores.count(g.activePlayerId);
    this.text("end-number", pad(g.end + 1));
    this.text("arrow-number", pad(Math.min(6, shots.length + 1)));
    this.text("total-score", pad(g.scores.total(g.activePlayerId), 3));
    this.text(
      "end-score",
      shots.reduce((a, s) => a + s.score, 0),
    );
    this.text("remaining", 72 - count);
    this.els["arrow-dots"].innerHTML = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="${i < shots.length ? "shot " + this.scoreClass(shots[i].score) : i === shots.length ? "current" : ""}">${i < shots.length ? (shots[i].isX ? "X" : shots[i].score || "M") : String(i + 1).padStart(2, "0")}</span>`,
    ).join("");
    const last = shots.at(-1);
    this.text("last-shot", last ? (last.isX ? "X" : last.score || "M") : "—");
    this.text(
      "last-position",
      last
        ? `${last.x >= 0 ? "우" : "좌"} ${Math.abs(last.x * 100).toFixed(1)} · ${last.y >= 0 ? "상" : "하"} ${Math.abs(last.y * 100).toFixed(1)} cm`
        : "첫 화살을 기다립니다",
    );
    this.text(
      "last-flight",
      last
        ? `${last.flightTime.toFixed(2)} s  /  ${last.speed.toFixed(1)} m/s`
        : "정밀 명중 기록",
    );
    if (this.lastShotCount !== count) {
      this.lastShotCount = count;
      this.drawTarget();
    }
  }
  private scoreClass(score: number) {
    return score >= 9
      ? "gold"
      : score >= 7
        ? "red"
        : score >= 5
          ? "blue"
          : score > 0
            ? "dark"
            : "miss";
  }
  private drawTarget() {
    const ctx = this.target.getContext("2d")!;
    const size = this.target.width;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(this.targetFace, 10, 10, size - 20, size - 20);
    const shots = this.game.scores.get(this.game.activePlayerId).ends[
      this.game.end
    ];
    for (const [i, s] of shots.entries()) {
      const scale = (size - 20) / (CONFIG.target.radius * 2);
      const x = size / 2 + s.x * scale,
        y = size / 2 - s.y * scale;
      if (x < 3 || x > size - 3 || y < 3 || y > size - 3) continue;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#192d26";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(String(i + 1), x + 8, y - 6);
    }
  }
  private showHit() {
    const hit = this.game.lastImpact!;
    this.text("hit-score", hit.isX ? "X" : hit.score || "M");
    this.text(
      "hit-eyebrow",
      hit.isX
        ? "INNER TEN"
        : hit.score === 10
          ? "PERFECT TEN"
          : hit.score
            ? "ON TARGET"
            : "OFF TARGET",
    );
    this.text(
      "hit-description",
      hit.isX
        ? "흔들림 없는 한 발"
        : hit.score === 10
          ? "중심을 꿰뚫는 한 발"
          : hit.score
            ? `${hit.score}점 · ${hit.flightTime.toFixed(2)}초의 비행`
            : "조준과 장력을 다시 확인하세요",
    );
    this.els["shot-result"].classList.toggle("perfect", hit.score === 10);
  }
  private openModal(kind: string, content: string) {
    this.game.cancelDraw();
    this.game.paused = true;
    document.exitPointerLock?.();
    this.modalKind = kind;
    this.modal.innerHTML = content;
    this.els["modal-backdrop"].hidden = false;
    this.root.dataset.modal = "open";
    this.modal
      .querySelector<HTMLButtonElement>("[data-close]")
      ?.addEventListener("click", () => this.closeModal());
    this.modal.querySelector<HTMLButtonElement>("button")?.focus();
  }
  closeModal() {
    if (this.modalKind === "end" || this.modalKind === "finished") return;
    this.modalKind = "";
    this.els["modal-backdrop"].hidden = true;
    delete this.root.dataset.modal;
    this.game.paused = false;
    this.canvas.focus({ preventScroll: true });
    if (this.game.phase === "end") this.showEnd();
    else if (this.game.phase === "finished") this.showScore(true);
  }
  private heading(eyebrow: string, title: string, close = true) {
    return `<div class="modal-heading"><div><div class="eyebrow">${eyebrow}</div><h2 id="modal-title">${title}</h2></div>${close ? `<button class="icon-button" data-close aria-label="닫기">${icon("close")}</button>` : ""}</div>`;
  }
  showHelp() {
    this.openModal(
      "help",
      `${this.heading("THE ART OF ARCHERY", "한 발을 위한 작은 안내")}<p class="modal-intro">바람을 읽고, 활을 당기고, 놓는 순간에 집중하세요.</p><div class="help-steps"><div><span>01</span><section><h3>누른 채, 천천히 당기기</h3><p>경기장에서 마우스 왼쪽 버튼을 누르세요. 약 1.45초 후 완전 인장에 도달합니다. 에너지는 당긴 길이와 장력으로 결정됩니다.</p></section></div><div><span>02</span><section><h3>바람을 읽고 조준하기</h3><p>누른 상태에서 마우스를 움직여 조준하세요. 조준기는 완전 인장·무풍·70m에 맞춰져 있습니다. 깃발이 오른쪽으로 날리면 왼쪽으로 보정하세요.</p></section></div><div><span>03</span><section><h3>호흡을 멈추고, 놓기</h3><p>버튼을 놓으면 화살이 날아갑니다. 4초 이상 유지하면 피로로 흔들립니다. 너무 짧게 클릭하면 발사가 취소됩니다.</p></section></div></div><div class="rules-strip"><span><b>70</b> m</span><span><b>6</b> 발 / END</span><span><b>12</b> ENDS</span><span><b>720</b> 만점</span></div><p class="fine-print">화살 가장자리가 선에 닿으면 높은 점수로 판정합니다. X는 안쪽 10점입니다. 경기마다 날씨가, 엔드마다 바람이 자동으로 생성됩니다. 제한 시간 없는 개인 랭킹 라운드입니다.</p><div class="key-guide"><span><kbd>F</kbd> 조준 / 발사</span><span><kbd>ESC</kbd> 당기기 취소</span><span><kbd>R</kbd> 조준 초기화</span><span><kbd>M</kbd> 음소거</span></div><button class="primary-button wide" data-close-bottom>사대로 돌아가기 ${icon("arrow")}</button>`,
    );
    this.modal
      .querySelector("[data-close-bottom]")!
      .addEventListener("click", () => this.closeModal());
  }
  renderer: RangeRenderer | null = null;
  showSettings() {
    this.openModal(
      "settings",
      `${this.heading("YOUR RANGE", "플레이 설정")}<div class="setting-row"><div><strong>화살 추적 카메라</strong><p>발사 후 탄도와 표적을 가까이 확인합니다.</p></div><label class="switch"><input id="cinematic-setting" type="checkbox" ${this.renderer?.cameras.cinematic ? "checked" : ""}/><span></span></label></div><div class="setting-row"><div><strong>마우스 감도</strong><p>낮은 감도로 더 세밀하게 조준하세요.</p></div><input id="sensitivity-setting" aria-label="마우스 감도" type="range" min="0.3" max="2" step="0.1" value="${this.sensitivity}"/></div><div class="setting-row"><div><strong>환경과 효과음</strong><p>바람, 새소리, 활시위와 명중 소리</p></div><input id="volume-setting" aria-label="음량" type="range" min="0" max="1" step="0.05" value="${this.audio.volume}"/></div><div class="setting-row"><div><strong>새 경기 시작</strong><p>현재 기록을 초기화하고 날씨를 다시 생성합니다.</p></div><button class="secondary-button" id="new-match">새 경기</button></div><div class="equipment-note">${icon("target")}<div><strong>리커브 · 44 lb / 70 cm</strong><span>카본 화살 24 g · 중력 9.81 m/s² · 70m 영점</span></div></div>`,
    );
    this.modal.querySelector<HTMLInputElement>("#cinematic-setting")!.onchange =
      (e) => {
        if (this.renderer)
          this.renderer.cameras.cinematic = (
            e.target as HTMLInputElement
          ).checked;
      };
    this.modal.querySelector<HTMLInputElement>(
      "#sensitivity-setting",
    )!.oninput = (e) =>
      (this.sensitivity = Number((e.target as HTMLInputElement).value));
    this.modal.querySelector<HTMLInputElement>("#volume-setting")!.oninput = (
      e,
    ) => {
      this.audio.setVolume(Number((e.target as HTMLInputElement).value));
      void this.audio.start(this.game.weather.current);
    };
    this.modal
      .querySelector("#new-match")!
      .addEventListener("click", () => this.confirmRestart());
  }
  private confirmRestart() {
    this.openModal(
      "restart",
      `${this.heading("A FRESH START", "새 경기를 시작할까요?")}<p class="modal-intro">현재 ${this.game.scores.count(this.game.activePlayerId)}발의 경기 기록이 초기화됩니다. 새로운 날씨와 바람으로 첫 엔드를 시작합니다.</p><div class="modal-actions"><button class="secondary-button" id="cancel-restart">계속 경기하기</button><button class="primary-button" id="confirm-restart">새 경기 시작 ${icon("arrow")}</button></div>`,
    );
    this.modal
      .querySelector("#cancel-restart")!
      .addEventListener("click", () => this.closeModal());
    this.modal
      .querySelector("#confirm-restart")!
      .addEventListener("click", () => {
        this.game.restart();
        this.closeModal();
      });
  }
  private shotRow(shots: Shot[]) {
    return Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="score-chip ${shots[i] ? this.scoreClass(shots[i].score) : "empty"}">${shots[i] ? (shots[i].isX ? "X" : shots[i].score || "M") : "—"}</span>`,
    ).join("");
  }
  private showEnd() {
    const g = this.game,
      shots = g.scores.get(g.activePlayerId).ends[g.end],
      sum = shots.reduce((s, a) => s + a.score, 0);
    this.openModal(
      "end",
      `${this.heading(`END ${pad(g.end + 1)} COMPLETE`, "한 호흡, 한 엔드.", false)}<div class="end-summary"><strong>${pad(sum)}<small> / 60</small></strong><span>누적 ${g.scores.total(g.activePlayerId)}점</span></div><div class="end-shots">${this.shotRow(shots)}</div><p class="modal-intro">화살 6발의 기록이 저장되었습니다.<br>다음 엔드에서는 새로운 바람을 살펴보세요.</p><button class="primary-button wide" id="next-end">${pad(g.end + 2)}번째 엔드 시작 ${icon("arrow")}</button>`,
    );
    this.modal.querySelector("#next-end")!.addEventListener("click", () => {
      this.modalKind = "";
      g.nextEnd();
      this.closeModal();
    });
  }
  showScore(finished = false) {
    const g = this.game,
      ends = g.scores.get(g.activePlayerId).ends,
      all = ends.flat(),
      total = g.scores.total(g.activePlayerId);
    this.openModal(
      finished ? "finished" : "score",
      `${this.heading(finished ? "QUALIFICATION COMPLETE" : "YOUR SCORECARD", finished ? "72발의 집중, 하나의 기록." : "경기 기록", !finished)}<div class="score-summary"><div><span class="label">TOTAL SCORE</span><strong>${pad(total, 3)}<small> / 720</small></strong></div><div><span>평균 점수</span><b>${all.length ? (total / all.length).toFixed(2) : "—"}</b></div><div><span>10 / X</span><b>${all.filter((s) => s.score === 10).length} / ${all.filter((s) => s.isX).length}</b></div></div><div class="score-table-wrap"><table class="score-table"><thead><tr><th>END</th><th>ARROWS</th><th>합계</th><th>누적</th></tr></thead><tbody>${ends
        .map(
          (shots, i) =>
            `<tr class="${i === g.end ? "active" : ""}"><td>${pad(i + 1)}</td><td><div>${this.shotRow(shots)}</div></td><td>${shots.length ? shots.reduce((s, a) => s + a.score, 0) : "—"}</td><td>${
              shots.length
                ? ends
                    .slice(0, i + 1)
                    .flat()
                    .reduce((s, a) => s + a.score, 0)
                : "—"
            }</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table></div><div class="modal-actions"><button class="secondary-button" id="export-scores">기록 다운로드</button><button class="primary-button" id="score-action">${finished ? "새 경기 시작" : "사대로 돌아가기"} ${icon("arrow")}</button></div><p class="fine-print">X = 안쪽 10점 · M = 표적 밖 · 72발 랭킹 라운드</p>`,
    );
    this.modal.querySelector("#score-action")!.addEventListener("click", () => {
      this.modalKind = "";
      if (finished) g.restart();
      this.closeModal();
    });
    this.modal
      .querySelector("#export-scores")!
      .addEventListener("click", () => this.export());
  }
  private export() {
    const g = this.game;
    const rows = [
      "End,Arrow,Score,X,Horizontal_cm,Vertical_cm,Flight_s,Impact_mps,Draw_percent,Wind_mps",
    ];
    g.scores
      .get(g.activePlayerId)
      .ends.forEach((end, e) =>
        end.forEach((s, i) =>
          rows.push(
            [
              e + 1,
              i + 1,
              s.score,
              s.isX ? "X" : "",
              s.x * 100,
              s.y * 100,
              s.flightTime,
              s.speed,
              s.draw * 100,
              s.wind,
            ].join(","),
          ),
        ),
      );
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + rows.join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "stillpoint-scorecard.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast("경기 기록을 다운로드했습니다");
  }
  toast(message: string) {
    this.text("toast", message);
    this.els.toast.classList.add("visible");
    setTimeout(() => this.els.toast.classList.remove("visible"), 2600);
  }
}
