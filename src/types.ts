export interface Cue {
  time: number;
  position: 'up' | 'down';
}

export interface Attempt {
  date: string;
  cuesCompleted: number;
  totalCues: number;
  completed: boolean;
  duration?: number;
  hour?: number;
}

export type RootStackParamList = {
  Home: undefined;
  Challenge: undefined;
  Calibrate: undefined;
  History: undefined;
  Import: undefined;
};
