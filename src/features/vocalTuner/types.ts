export interface NoteInfo {
  name: string;
  octave: number;
  freq: number;
  cents: number;
}

export interface Recording {
  id: number;
  name: string;
  time: string;
  url: string;
  dur: number;
  blob: Blob;
}
