export interface NoteInfo {
  name: string;
  octave: number;
  freq: number;
  cents: number;
}

export interface Recording {
  id: string;
  name: string;
  time: string;
  url: string;
  dur: number;
  blob: Blob;
  createdAt: number;
  userId?: string;
}
