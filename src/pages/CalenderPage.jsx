import { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import { isHoliday } from "japanese-holidays";
import GameModal from "../components/GameModal";
import { getEventColor } from "../utils/getEventColor";
import TeamBadge from "../constants/teamBagde";

const STORAGE_KEY = "npb-events";

// 保存
const saveEvents = (events) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

const TEAMS = [
    "すべて",
    "ソフトバンク", "日本ハム", "オリックス", "楽天", "西武", "ロッテ",
    "阪神", "DeNA", "巨人", "中日", "広島", "ヤクルト"
];

const parseNumber = (v) => Number(String(v).replace(/,/g, "")) || 0;

const getEventTotal = (ev) => {
    const c = ev.extendedProps.cost;
    return (
        parseNumber(c.ticket) +
        parseNumber(c.beerCost) +
        parseNumber(c.ballparkFood) +
        parseNumber(c.goods) +
        parseNumber(c.travelCost)
    );
};

export default function CalenderPage() {
    const [events, setEvents] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState("ソフトバンク");
    const [modalEventId, setModalEventId] = useState(null);

    const modalEvent = events.find(e => e.id === modalEventId);

    useEffect(() => {
        const stored = localStorage.getItem("npb-events");

        if (stored) {
            setEvents(JSON.parse(stored));
            return;
        }

        fetch("/games.json")
            .then(res => res.json())
            .then(data => {
                const converted = data.map((g, idx) => ({
                    id: String(idx),
                    title: `${g.home} vs ${g.away}`,
                    date: g.date,
                    extendedProps: {
                        home: g.home,
                        away: g.away,
                        stadium: g.stadium,
                        startTime: g.startTime,
                        attended: false,
                        favorite: false,
                        cost: {
                            ticket: "",
                            beerCost: "",
                            beerCount: "",
                            ballparkFood: "",
                            goods: "",
                            travelCost: ""
                        },
                        startingPitcher: { home: "", away: "" },
                        memo: ""
                    }
                }));

                setEvents(converted);
                localStorage.setItem("npb-events", JSON.stringify(converted));
            });
    }, []);

    const eventContent = (arg) => {
        const ev = events.find(e => e.id === arg.event.id);
        const { home, away, startTime, stadium } = ev.extendedProps;

        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontSize: 11,
                lineHeight: 1.25
            }}>
                {/* 上段：対戦 */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <TeamBadge team={home} showName={false} size={18} />
                    <span>vs</span>
                    <TeamBadge team={away} showName={false} size={18} />
                </div>

                {/* 下段：時刻＋球場 */}
                <div style={{
                    fontSize: 10,
                    color: "#555",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%"
                }}>
                    {startTime && `${startTime} `}
                    {stadium}
                </div>
            </div>
        );
    };

    const filteredEvents = useMemo(() => {
        if (selectedTeam === "すべて") return events;

        return events.filter(ev =>
            ev.extendedProps.home === selectedTeam ||
            ev.extendedProps.away === selectedTeam
        );
    }, [events, selectedTeam]);

    if (events.length === 0) {
        return <div>試合データ読み込み中...</div>;
    }

    return (
        <div className="page-container">
            <h1 className="page-title">⚾ プロ野球カレンダー</h1>

            <div className="filter-row">
                <label>
                    表示球団：
                    <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="team-select"
                    >
                        <option value="すべて">すべて表示</option>
                        {TEAMS.map((team) => (
                            <option key={team} value={team}>
                                {team}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* 凡例 */}
            <div className="filter-row legend-row" style={{ gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, display: 'inline-block', background: '#A5D6A7', borderRadius: 2 }}></span>
                    <small>観戦済み</small>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, display: 'inline-block', background: '#FFE082', borderRadius: 2 }}></span>
                    <small>お気に入り</small>
                </div>
            </div>

            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={jaLocale}
                headerToolbar={{
                    left: "today",
                    center: "prev title next",
                    right: ""
                }}
                titleFormat={{ year: "numeric", month: "long" }}
                height="auto"
                events={filteredEvents.map(ev => ({
                    ...ev,
                    classNames: [
                        ev.extendedProps.attended ? "attended" :
                            ev.extendedProps.favorite ? "favorite" : "default"
                    ],
                    backgroundColor: getEventColor(ev),
                    borderColor: getEventColor(ev),
                    textColor: '#111'
                }))}
                eventContent={eventContent}
                eventClick={(info) => setModalEventId(info.event.id)}
                dayCellDidMount={(info) => {
                    const date = info.date;

                    // 同日のイベントを全て検索（別球団のものも対象）
                    const eventsOnDate = events.filter(ev => {
                        const d = new Date(ev.date);
                        return d.getFullYear() === date.getFullYear() &&
                            d.getMonth() === date.getMonth() &&
                            d.getDate() === date.getDate();
                    });

                    // 優先度: 観戦済み > お気に入り
                    let dayColor = null;
                    const attendedEv = eventsOnDate.find(ev => ev.extendedProps && ev.extendedProps.attended);
                    const favoriteEv = eventsOnDate.find(ev => ev.extendedProps && ev.extendedProps.favorite);

                    if (attendedEv) dayColor = getEventColor(attendedEv);
                    else if (favoriteEv) dayColor = getEventColor(favoriteEv);

                    if (dayColor) {
                        info.el.style.backgroundColor = dayColor;
                        return;
                    }

                    // 既存の週末/祝日カラー（イベント色がない場合のみ適用）
                    const day = date.getDay();
                    const holidayFlag = isHoliday(date);
                    if (day === 6) info.el.style.backgroundColor = "#E3F2FD";
                    else if (day === 0 || holidayFlag) info.el.style.backgroundColor = "#FFCDD2";
                }}
                dayCellContent={(args) => args.dayNumberText.replace("日", "")}
            />

            <GameModal
                event={modalEvent}
                onClose={() => setModalEventId(null)}
                onUpdate={(updatedEvent) => {
                    setEvents((prev) => {
                        const next = prev.map((ev) =>
                            ev.id === updatedEvent.id ? updatedEvent : ev
                        );
                        saveEvents(next);
                        return next;
                    });
                }}
                getEventColor={(ev) => getEventColor(ev, selectedTeam)}
                getEventTotal={getEventTotal}
            />
        </div>
    );
}
