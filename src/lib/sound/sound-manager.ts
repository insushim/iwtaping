'use client';

type SoundType = 'keyClick' | 'keyError' | 'keySpace' | 'keyEnter' | 'explosion' | 'levelUp' | 'combo' | 'achievement' | 'gameOver' | 'countdown';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;
  private bgmEnabled = true;
  private bgmVolume = 0.3;
  private sfxEnabled = true;
  private sfxVolume = 0.5;

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
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  play(type: SoundType, variation: number = 0): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
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

  private createGain(ctx: AudioContext, vol: number): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = vol * this.volume * this.sfxVolume;
    gain.connect(ctx.destination);
    return gain;
  }

  private playKeyClick(ctx: AudioContext, variation: number): void {
    const osc = ctx.createOscillator();
    const gain = this.createGain(ctx, 0.15);
    const freq = 800 + variation * 50 + Math.random() * 100;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);

    // Add noise burst
    const bufferSize = ctx.sampleRate * 0.005;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.createGain(ctx, 0.05);
    noise.connect(noiseGain);
    noise.start(ctx.currentTime);
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
    const gain = this.createGain(ctx, 0.1);
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
    const gain = this.createGain(ctx, 0.15);
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

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null;
