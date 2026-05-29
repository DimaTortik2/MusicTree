import * as Tone from 'tone';
import { globalAudioContext } from './audioEngine';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { useProgressStore } from '@/app/store/useProgressStore';

class ToneEngine {
  private synth: Tone.PolySynth | null = null;
  private sampler: Tone.Sampler | null = null;
  private volumeNode: Tone.Volume | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;

    this.volumeNode = new Tone.Volume(0).toDestination();

    // 1. Возвращаем самый первый базовый синтезатор (без реверба и компрессоров)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).connect(this.volumeNode); // Напрямую в мастер-громкость

    this.isInitialized = true;
    this.initMIDI();

    if (useProgressStore.getState().pianoSoundType === 'acoustic') {
      this.loadAcousticSamples(true);
    }
  }

  public loadAcousticSamples(silent = false) {
    if (this.sampler) return;

    const store = useActiveKeysStore.getState();
    if (!silent) {
      store.setIsPianoLoading(true);
      store.setPianoLoadProgress(0);
    }

    let progress = 0;
    let progressInterval: ReturnType<typeof setInterval>;

    if (!silent) {
      progressInterval = setInterval(() => {
        progress += (90 - progress) * 0.1;
        useActiveKeysStore.getState().setPianoLoadProgress(progress);
      }, 100);
    }

    this.sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3',
        C1: 'C1.mp3',
        'D#1': 'Ds1.mp3',
        'F#1': 'Fs1.mp3',
        A1: 'A1.mp3',
        C2: 'C2.mp3',
        'D#2': 'Ds2.mp3',
        'F#2': 'Fs2.mp3',
        A2: 'A2.mp3',
        C3: 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        A3: 'A3.mp3',
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        A5: 'A5.mp3',
        C6: 'C6.mp3',
        'D#6': 'Ds6.mp3',
        'F#6': 'Fs6.mp3',
        A6: 'A6.mp3',
        C7: 'C7.mp3',
        'D#7': 'Ds7.mp3',
        'F#7': 'Fs7.mp3',
        A7: 'A7.mp3',
        C8: 'C8.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      release: 1.5,
      onload: () => {
        if (!silent) {
          clearInterval(progressInterval);
          useActiveKeysStore.getState().setPianoLoadProgress(100);
          setTimeout(() => {
            useActiveKeysStore.getState().setIsPianoLoading(false);
          }, 400);
        }
      },
    });

    // Инициализируем аудиоузел, если метод вызван напрямую
    if (!this.volumeNode) this.init();

    // Акустику также подключаем напрямую к громкости
    this.sampler.connect(this.volumeNode!);
  }

  public playNote(note: string) {
    if (!this.isInitialized) this.init();
    if (globalAudioContext.state !== 'running') {
      globalAudioContext.resume().catch(console.error);
    }

    const isAcoustic = useProgressStore.getState().pianoSoundType === 'acoustic';

    // БЕСШОВНОСТЬ: Играем сэмплер только если он выбран И успел загрузиться
    if (isAcoustic && this.sampler?.loaded) {
      this.sampler.triggerAttack(note);
    } else {
      this.synth?.triggerAttack(note);
    }
  }

  public releaseNote(note: string) {
    // Отпускаем оба, чтобы избежать зависания нот при резком переключении режима
    this.sampler?.triggerRelease(note);
    this.synth?.triggerRelease(note);
  }

  public releaseAll() {
    this.sampler?.releaseAll();
    this.synth?.releaseAll();
  }

  public setVolume(val: number, isMuted: boolean) {
    if (!this.volumeNode) this.init();
    if (isMuted || val === 0) {
      this.volumeNode!.mute = true;
    } else {
      this.volumeNode!.mute = false;
      // Оригинальная формула громкости
      const db = val === 0 ? -Infinity : 20 * Math.log10(val / 100);
      this.volumeNode!.volume.value = db;
    }
  }

  private initMIDI() {
    if (navigator.requestMIDIAccess) {
      navigator
        .requestMIDIAccess()
        .then((midiAccess) => {
          for (const input of midiAccess.inputs.values()) {
            input.onmidimessage = (msg) => this.handleMIDIMessage(msg);
          }
          midiAccess.onstatechange = (e) => {
            const port = (e as any).port;
            if (port.type === 'input' && port.state === 'connected') {
              (port as MIDIInput).onmidimessage = (msg) => this.handleMIDIMessage(msg);
            }
          };
        })
        .catch(console.error);
    }
  }

  private handleMIDIMessage(message: any) {
    const [command, note, velocity] = message.data;
    if (command === 144 && velocity > 0) {
      this.playNote(Tone.Frequency(note, 'midi').toNote());
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      this.releaseNote(Tone.Frequency(note, 'midi').toNote());
    }
  }

  public disposeEngine() {
    this.synth?.dispose();
    this.sampler?.dispose();
    this.volumeNode?.dispose();

    this.synth = null;
    this.sampler = null;
    this.volumeNode = null;
    this.isInitialized = false;
  }
}

export const toneEngine = new ToneEngine();
