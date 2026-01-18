// src/components/TeamIcon.tsx
import { TEAM_KEY } from "./teams";

type Props = {
    team: string;
    size?: number;
    faded?: boolean;
};

export function TeamIcon({ team, size = 20, faded }: Props) {
    const key = TEAM_KEY[team];
    if (!key) return null; // ← アイコン未取得球団

    return (
        <img
            src={`/teams/${key}.svg`}
            alt={team}
            width={size}
            height={size}
            className={faded ? "opacity-40 grayscale" : ""}
        />
    );
}
