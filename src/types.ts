export interface Habit {
    id: string;
    name: string;
    color: string;
    days: number[]; // 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
}

export interface HabitsData {
    habits: Habit[];
    completions: Record<string, string[]>;
}