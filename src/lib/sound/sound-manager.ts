'use client';

type SoundType = 'keyClick' | 'keyError' | 'keySpace' | 'keyEnter' | 'explosion' | 'levelUp' | 'combo' | 'achievement' | 'gameOver' | 'countdown' | 'confirm' | 'click';

/**
 * 이벤트 효과음은 실제 CC0 녹음(Kenney)을 쓴다. 오실레이터 합성은 "8비트 삐-소리"가 되기 때문.
 * 타건음(keyClick/Space/Enter)만 합성을 유지한다 — 상점 키음 팩 5종이 파라미터 기반이고,
 * 초당 10회 이상 무한 변주가 필요한 절차적 생성음이라 오히려 합성이 맞는 사례다.
 * 파일이 로드되기 전이거나 실패하면 아래 합성 폴백으로 조용히 떨어진다(오프라인에서도 안 죽음).
 * 매핑 교체는 이 표 한 줄만 고치면 된다. 출처·라이선스 = public/audio/CREDITS.md
 */
const SFX_FILES: Partial<Record<SoundType, string>> = {
  keyError: '/audio/sfx/error.mp3',
  explosion: '/audio/sfx/explosion.mp3',
  levelUp: '/audio/sfx/levelup.mp3',
  combo: '/audio/sfx/combo.mp3',
  achievement: '/audio/sfx/achievement.mp3',
  gameOver: '/audio/sfx/gameover.mp3',
  countdown: '/audio/sfx/countdown.mp3',
  confirm: '/audio/sfx/confirm.mp3',
  click: '/audio/sfx/click.mp3',
};

/** 같은 소리가 한 프레임에 겹쳐 찢어지는 것을 막는 최소 간격(ms). */
const SFX_COOLDOWN_MS: Partial<Record<SoundType, number>> = {
  keyError: 60,
  explosion: 40,
  combo: 50,
  levelUp: 200,
  achievement: 400,
  gameOver: 800,
  countdown: 150,
  confirm: 80,
  click: 40,
};

/** 게임별 BGM 트랙. 전부 CC0(OpenGameArt — 5 Chiptunes (Action)). */
export type BgmTrack = 'action' | 'focus' | 'boss' | 'title';
const BGM_FILES: Record<BgmTrack, string> = {
  action: '/audio/bgm/action.mp3',
  focus: '/audio/bgm/focus.mp3',
  boss: '/audio/bgm/boss.mp3',
  title: '/audio/bgm/title.mp3',
};

/** 상점에서 구매·장착하는 타이핑 음 팩. 기본(default)은 무료. */
export type KeyTheme = 'default' | 'mechanical' | 'typewriter' | 'soft' | 'retro';

interface KeyThemeParams {
  wave: OscillatorType;
  baseFreq: number;
  gain: number;
  noise: number; // 0~1, 클릭 노이즈 세기
}

const KEY_THEME_PARAMS: Record<KeyTheme, KeyThemeParams> = {
  default: { wave: 'sine', baseFreq: 800, gain: 0.15, noise: 0.05 },
  mechanical: { wave: 'square', baseFreq: 1150, gain: 0.12, noise: 0.12 },
  typewriter: { wave: 'triangle', baseFreq: 520, gain: 0.18, noise: 0.18 },
  soft: { wave: 'sine', baseFreq: 420, gain: 0.10, noise: 0.0 },
  retro: { wave: 'square', baseFreq: 660, gain: 0.13, noise: 0.02 },
};

/** 상점 UI용 메타데이터(가격은 shop-catalog에서 관리). */
export const KEY_THEMES: { id: KeyTheme; label: string; desc: string }[] = [
  { id: 'default', label: '기본', desc: '깔끔한 기본 타건음' },
  { id: 'mechanical', label: '기계식', desc: '청축 느낌의 또각또각' },
  { id: 'typewriter', label: '타자기', desc: '옛날 타자기 감성' },
  { id: 'soft', label: '소프트', desc: '조용하고 부드러운 소리' },
  { id: 'retro', label: '레트로', desc: '8비트 게임 블립' },
];

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;
  private bgmEnabled = true;
  private bgmVolume = 0.3;
  private sfxEnabled = true;
  private sfxVolume = 0.5;
  private keyVolume = 0.5;
  private keyTheme: KeyTheme = 'default';

  /** 디코드된 CC0 효과음. 비어 있으면 합성 폴백으로 떨어진다. */
  private buffers = new Map<SoundType, AudioBuffer>();
  private lastPlayed = new Map<SoundType, number>();
  private preloadStarted = false;
  private bgmEl: HTMLAudioElement | null = null;
  private bgmTrack: BgmTrack | null = null;
  private bgmFadeTimer: ReturnType<typeof setInterval> | null = null;

  setKeyTheme(theme: KeyTheme): void {
    if (KEY_THEME_PARAMS[theme]) this.keyTheme = theme;
  }

  /**
   * 효과음 파일을 미리 디코드한다. <audio> 태그는 첫 재생에 수십 ms 지연이 있어 게임에선 못 쓴다.
   * 첫 사용자 입력 직후 한 번만 호출하면 된다(브라우저 자동재생 정책).
   */
  async preload(): Promise<void> {
    if (this.preloadStarted || typeof window === 'undefined') return;
    this.preloadStarted = true;
    let ctx: AudioContext;
    try {
      ctx = this.getContext();
    } catch {
      return;
    }
    await Promise.all(
      (Object.entries(SFX_FILES) as [SoundType, string][]).map(async ([type, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          this.buffers.set(type, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // 로드 실패 → 해당 음만 합성 폴백. 오프라인에서도 게임은 계속 돈다.
        }
      })
    );
  }

  /** 첫 사용자 제스처에서 호출 — suspended 컨텍스트를 깨운다. */
  resume(): void {
    try {
      this.getContext();
    } catch {
      // ignore
    }
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopBgm(200);
    else if (this.bgmTrack && this.bgmEnabled) this.playBgm(this.bgmTrack);
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.bgmEl && !this.bgmFadeTimer) this.bgmEl.volume = this.bgmTargetVolume();
  }

  setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (!enabled) this.stopBgm(300);
    else if (this.bgmTrack) this.playBgm(this.bgmTrack);
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmEl && !this.bgmFadeTimer) this.bgmEl.volume = this.bgmTargetVolume();
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  /** 타건음 전용 볼륨(설정의 '키 사운드 볼륨'). 이벤트 효과음과 독립이다. */
  setKeyVolume(vol: number): void {
    this.keyVolume = Math.max(0, Math.min(1, vol));
  }

  private isKeySound(type: SoundType): boolean {
    return type === 'keyClick' || type === 'keySpace' || type === 'keyEnter';
  }

  play(type: SoundType, variation: number = 0): void {
    if (!this.enabled) return;
    // 타건음은 호출부의 settings.keySound가, 나머지 이벤트음은 settings.sfx가 관장한다.
    if (!this.isKeySound(type) && !this.sfxEnabled) return;

    const cooldown = SFX_COOLDOWN_MS[type];
    if (cooldown) {
      const now = Date.now();
      if (now - (this.lastPlayed.get(type) ?? 0) < cooldown) return;
      this.lastPlayed.set(type, now);
    }

    try {
      const ctx = this.getContext();

      // ① 실제 녹음 우선 — 콤보는 카운트에 따라 피치를 올려 상승감을 준다.
      const rate = type === 'combo' ? 1 + Math.min(variation * 0.015, 0.5) : 1;
      if (this.playSample(ctx, type, rate)) return;

      // ② 파일이 아직 없거나 로드 실패 → 합성 폴백
      switch (type) {
        case 'keyClick': this.playKeyClick(ctx, variation); break;
        case 'keyError': this.playKeyError(ctx); break;
        case 'keySpace': this.playKeySpace(ctx); break;
        case 'keyEnter': this.playKeyEnter(ctx); break;
        case 'explosion': this.playExplosion(ctx); break;
        case 'levelUp': this.playLevelUp(ctx); break;
        case 'combo': this.playCombo(ctx, variation); break;
        case 'achievement': this.playAchievement(ctx); break;
        case 'gameOver': this.playGameOver(ctx); break;
        case 'countdown': this.playCountdown(ctx); break;
      }
    } catch {
      // Silently ignore audio errors
    }
  }

  private createGain(ctx: AudioContext, vol: number, channel: 'sfx' | 'key' = 'sfx'): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = vol * this.volume * (channel === 'key' ? this.keyVolume : this.sfxVolume);
    gain.connect(ctx.destination);
    return gain;
  }

  private playKeyClick(ctx: AudioContext, variation: number): void {
    const t = KEY_THEME_PARAMS[this.keyTheme] ?? KEY_THEME_PARAMS.default;
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, t.gain, 'key');
    const freq = t.baseFreq + variation * 50 + Math.random() * 100;
    osc.type = t.wave;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);

    // Add noise burst (테마별 세기)
    if (t.noise > 0) {
      const bufferSize = ctx.sampleRate * 0.005;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.createGain(ctx, t.noise, 'key');
      noise.connect(noiseGain);
      noise.start(ctx.currentTime);
    }
  }

  private playKeyError(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.2);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  private playKeySpace(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.1, 'key');
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  }

  private playKeyEnter(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.15, 'key');
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  private playExplosion(ctx: AudioContext): void {
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    const gain = this.createGain(ctx, 0.3);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(ctx.currentTime);
  }

  private playLevelUp(ctx: AudioContext): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = this.createGain(ctx, 0.15);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15 * this.volume * this.sfxVolume, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  }

  private playCombo(ctx: AudioContext, comboCount: number): void {
    const baseFreq = 440 + Math.min(comboCount * 20, 400);
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.12);
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  private playAchievement(ctx: AudioContext): void {
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = this.createGain(ctx, 0.12);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12 * this.volume, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.35);
    });
  }

  private playGameOver(ctx: AudioContext): void {
    const notes = [440, 392, 349, 293];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = this.createGain(ctx, 0.15);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.15 * this.volume, ctx.currentTime + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.3);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.35);
    });
  }

  private playCountdown(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.2);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  /** 디코드된 샘플을 재생한다. 버퍼가 없으면 false → 호출부가 합성 폴백으로 넘어간다. */
  private playSample(ctx: AudioContext, type: SoundType, rate: number): boolean {
    const buf = this.buffers.get(type);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = this.volume * this.sfxVolume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);
    return true;
  }

  private bgmTargetVolume(): number {
    return Math.max(0, Math.min(1, this.volume * this.bgmVolume));
  }

  private clearBgmFade(): void {
    if (this.bgmFadeTimer) {
      clearInterval(this.bgmFadeTimer);
      this.bgmFadeTimer = null;
    }
  }

  private fadeBgm(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void): void {
    this.clearBgmFade();
    const from = el.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    this.bgmFadeTimer = setInterval(() => {
      i += 1;
      el.volume = Math.max(0, Math.min(1, from + ((to - from) * i) / steps));
      if (i >= steps) {
        this.clearBgmFade();
        onDone?.();
      }
    }, 50);
  }

  /**
   * BGM을 재생한다. 같은 트랙이 이미 돌고 있으면 아무것도 하지 않는다(재시작 방지).
   * 파일은 스트리밍이라 첫 화면 로딩을 막지 않는다.
   */
  playBgm(track: BgmTrack): void {
    if (typeof window === 'undefined') return;
    this.bgmTrack = track;
    if (!this.enabled || !this.bgmEnabled) return;

    if (this.bgmEl) {
      if (this.bgmEl.dataset.track === track && !this.bgmEl.paused) {
        this.clearBgmFade();
        this.bgmEl.volume = this.bgmTargetVolume();
        return;
      }
      this.disposeBgmEl();
    }

    try {
      const el = new Audio(BGM_FILES[track]);
      el.loop = true;
      el.preload = 'auto';
      el.dataset.track = track;
      el.volume = 0;
      this.bgmEl = el;
      // 자동재생 정책상 사용자 제스처 밖이면 거부된다 — 조용히 무시한다.
      void el.play().then(
        () => this.fadeBgm(el, this.bgmTargetVolume(), 800),
        () => undefined
      );
    } catch {
      this.bgmEl = null;
    }
  }

  private disposeBgmEl(): void {
    this.clearBgmFade();
    if (this.bgmEl) {
      this.bgmEl.pause();
      this.bgmEl.src = '';
      this.bgmEl = null;
    }
  }

  /** BGM을 페이드아웃 후 정지한다. forget=true면 다음 setBgmEnabled(true)에도 되살아나지 않는다. */
  stopBgm(fadeMs: number = 600, forget: boolean = false): void {
    if (forget) this.bgmTrack = null;
    const el = this.bgmEl;
    if (!el) return;
    if (fadeMs <= 0) {
      this.disposeBgmEl();
      return;
    }
    this.fadeBgm(el, 0, fadeMs, () => {
      if (this.bgmEl === el) this.disposeBgmEl();
    });
  }

  dispose(): void {
    this.disposeBgmEl();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null;
