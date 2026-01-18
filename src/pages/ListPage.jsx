import { useState, useMemo } from "react";
import GameModal from "../components/GameModal";
import { getEventColor } from "../utils/getEventColor";
import TeamBadge from "../constants/teamBagde";

const STORAGE_KEY = "npb-events";

const loadEvents = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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

// 日付を yyyy/m/d に変換
const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

// 月を yyyy/m に変換（ドロップダウン用）
const getMonthKey = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}`;
};

// 月表示用タイトル yyyy年m月
const formatMonthTitle = (monthKey) => {
    const [y, m] = monthKey.split("/");
    return `${y}年${Number(m)}月`;
};

export default function ListPage() {
    const [events, setEvents] = useState(loadEvents);
    const [selectedTeam, setSelectedTeam] = useState("すべて");
    const [selectedMonth, setSelectedMonth] = useState("すべて");
    const [modalEventId, setModalEventId] = useState(null);

    const modalEvent = events.find(e => e.id === modalEventId);

    // ===== 月一覧を生成（yyyy/m） =====
    const monthOptions = useMemo(() => {
        const months = new Set();
        events.forEach(ev => {
            if (ev.extendedProps.attended || ev.extendedProps.favorite) {
                months.add(getMonthKey(ev.date));
            }
        });
        return Array.from(months).sort((a,b) => new Date(a) - new Date(b));
    }, [events]);

    /* ===== 表示対象イベント ===== */
    const visibleEvents = useMemo(() => {
        return events.filter(ev => {
            const p = ev.extendedProps;

            if (!p.favorite && !p.attended) return false;
            if (selectedTeam !== "すべて" && p.home !== selectedTeam && p.away !== selectedTeam) return false;
            if (selectedMonth !== "すべて" && getMonthKey(ev.date) !== selectedMonth) return false;

            return true;
        });
    }, [events, selectedTeam, selectedMonth]);

    /* ===== 月別サマリー ===== */
    const monthlySummary = useMemo(() => {
        const map = {};

        visibleEvents.forEach(ev => {
            const month = getMonthKey(ev.date); // yyyy/m
            map[month] = (map[month] || 0) + getEventTotal(ev);
        });

        return map;
    }, [visibleEvents]);

    return (
        <div className="page-container">
            <h2 className="page-title">📋 観戦・お気に入り一覧</h2>

            {/* ===== チームフィルター ===== */}
            <div className="filter-row">
                <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="team-select"
                >
                    {TEAMS.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {/* ===== 月フィルター ===== */}
            <div className="filter-row">
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="month-select"
                >
                    <option value="すべて">すべての月</option>
                    {monthOptions.map((m) => (
                        <option key={m} value={m}>
                            {formatMonthTitle(m)}
                        </option>
                    ))}
                </select>
            </div>

            {/* ===== 月別サマリー ===== */}
            <div className="monthly-summary">
                <h3>💰 月別支出</h3>
                {Object.entries(monthlySummary).map(([month, total]) => (
                    <div key={month}>
                        {formatMonthTitle(month)}：{total.toLocaleString()} 円
                    </div>
                ))}
            </div>

            {/* ===== 一覧カード ===== */}
            {visibleEvents.map(ev => {
                let cardClass = "list-card";

                if (ev.extendedProps.attended) {
                    cardClass += " attended";   // 観戦済み優先
                } else if (ev.extendedProps.favorite) {
                    cardClass += " favorite";   // お気に入りのみ
                } else {
                    cardClass += " default";
                }

                return (
                    <div key={ev.id} className={cardClass} onClick={() => setModalEventId(ev.id)}>
                        <div className="list-card-title" style={{ display: "flex", gap: 6 }}>
                            <TeamBadge team={ev.extendedProps.home} size={22} fontSize={15} />
                            <span>vs</span>
                            <TeamBadge team={ev.extendedProps.away} size={22} fontSize={15} />
                        </div>
                        <div className="list-card-sub">
                            📅 {formatDate(ev.date)} 🏟 {ev.extendedProps.stadium}
                        </div>
                        <div className="list-card-total">支出：{getEventTotal(ev).toLocaleString()} 円</div>
                    </div>
                );
            })}

            {/* ===== モーダル ===== */}
            <GameModal
                event={modalEvent}
                onClose={() => setModalEventId(null)}
                onUpdate={(updatedEvent) => {
                    setEvents((prev) => {
                        const next = prev.map((ev) =>
                            ev.id === updatedEvent.id ? updatedEvent : ev
                        );
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                        return next;
                    });
                }}
                getEventColor={(ev) => getEventColor(ev)}
                getEventTotal={getEventTotal}
            />
        </div>
    );
}
