import * as Tone from 'tone';
import { globalAudioContext } from './audioEngine';

class ToneEngine {
  private synth: Tone.PolySynth | null = null;
  private volumeNode: Tone.Volume | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;

    // Мастер-громкость
    this.volumeNode = new Tone.Volume(0).toDestination();

    // Полифонический синтезатор (треугольник звучит мягче и больше похож на синтезаторное пианино)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).connect(this.volumeNode);

    this.isInitialized = true;
    this.initMIDI();
  }

  public playNote(note: string) {
    if (!this.synth) this.init();

    // ПРИНУДИТЕЛЬНО снимаем блокировку звука при клике/нажатии
    if (globalAudioContext.state !== 'running') {
      globalAudioContext.resume().catch(console.error);
    }

    this.synth?.triggerAttack(note);
  }

  public releaseNote(note: string) {
    this.synth?.triggerRelease(note);
  }

  public releaseAll() {
    this.synth?.releaseAll();
  }

  public setVolume(val: number, isMuted: boolean) {
    if (!this.volumeNode) this.init();
    if (isMuted || val === 0) {
      this.volumeNode!.mute = true;
    } else {
      this.volumeNode!.mute = false;
      // Перевод 0-100 в децибелы (от -60dB до 0dB)
      const db = val === 0 ? -Infinity : 20 * Math.log10(val / 100);
      this.volumeNode!.volume.value = db;
    }
  }

  // --- Web MIDI API ---
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
    // 144 - Note On, 128 - Note Off. Если velocity === 0, это тоже Note Off.
    if (command === 144 && velocity > 0) {
      const noteName = Tone.Frequency(note, 'midi').toNote();
      this.playNote(noteName);
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      const noteName = Tone.Frequency(note, 'midi').toNote();
      this.releaseNote(noteName);
    }
  }

  // Вызывать при размонтировании корневого Layout (защита от утечек)
  public disposeEngine() {
    this.synth?.dispose();
    this.volumeNode?.dispose();
    this.synth = null;
    this.volumeNode = null;
    this.isInitialized = false;
  }
}

export const toneEngine = new ToneEngine();
