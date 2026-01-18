import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

const TARGET_YEAR = 2026;
const MONTHS = [3,4,5,6,7,8,9,10,11];

type GameType = "regular";

interface Game {
    date: string;
    type: GameType;
    home: string;
    away: string;
    stadium: string;
    startTime: string | null;
}

async function fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
    });
    if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
    return res.text();
}

async function main() {
    const games: Game[] = [];

    for (const month of MONTHS) {
        const url = `https://npb.jp/games/${TARGET_YEAR}/schedule_${String(month).padStart(2,"0")}_detail.html`;
        console.log("fetch:", url);

        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        let currentDate = "";

        $("table tbody tr").each((_, tr) => {
            const th = $(tr).find("th").first();
            if (th.length) {
                const m = th.text().match(/(\d+)\/(\d+)/);
                if (m) {
                    currentDate = `${TARGET_YEAR}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
                }
            }

            const team1 = $(tr).find(".team1").text().trim();
            const team2 = $(tr).find(".team2").text().trim();
            if (!team1 || !team2 || !currentDate) return;

            const stadium = $(tr).find(".place").text().trim();
            const time = $(tr).find(".time").text().trim();

            games.push({
                date: currentDate,
                type: "regular",
                home: team1,
                away: team2,
                stadium,
                startTime: time || null,
            });
        });
    }

    // ===== オープン戦（同じ年定数を使用）=====
    const preseasonGames = await fetchPreseasonGames();
    games.push(...preseasonGames);

    const outDir = path.resolve("public");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    fs.writeFileSync(
        path.join(outDir, "games.json"),
        JSON.stringify(games, null, 2),
        "utf-8"
    );

    console.log(`✔ ${games.length} games saved`);
}

async function fetchPreseasonGames(): Promise<Game[]> {
    const url = `https://npb.jp/preseason/${TARGET_YEAR}/schedule_detail.html`;
    console.log("fetch preseason:", url);

    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const games: Game[] = [];
    let currentDate = "";

    $("table tbody tr").each((_, tr) => {
        const th = $(tr).find("th").first();
        if (th.length) {
            const m = th.text().match(/(\d+)\/(\d+)/);
            if (m) {
                currentDate =
                    `${TARGET_YEAR}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
            }
        }

        const team1 = $(tr).find(".team1").text().trim();
        const team2 = $(tr).find(".team2").text().trim();

        if (!team1 || !team2 || !currentDate) return;

        games.push({
            date: currentDate,
            home: team1,
            away: team2,
            stadium: $(tr).find(".place").text().trim(),
            startTime: $(tr).find(".time").text().trim() || null,
            type: "regular"
        });
    });

    return games;
}

main().catch(console.error);
