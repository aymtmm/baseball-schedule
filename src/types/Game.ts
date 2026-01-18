export type GameType = "公式戦" | "オープン戦";

export interface Game {
    id: string;
    date: string;        // yyyy-mm-dd
    type: GameType;
    home: string;
    away: string;
    stadium: string;
    startTime: string;
}
