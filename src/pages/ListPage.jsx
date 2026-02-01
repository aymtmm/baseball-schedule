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

// 月キー (yyyy/m) を Date に変換（比較用）
const parseMonthKeyToDate = (monthKey) => {
    const [y, m] = monthKey.split("/");
    return new Date(Number(y), Number(m) - 1, 1);
};

export default function ListPage() {
    const [events, setEvents] = useState(loadEvents);
    const [selectedTeam, setSelectedTeam] = useState("すべて");
    const [selectedYear, setSelectedYear] = useState("すべて");
    const [selectedMonth, setSelectedMonth] = useState("すべて");
    const [modalEventId, setModalEventId] = useState(null);

    const modalEvent = events.find(e => e.id === modalEventId);

    // プリセット適用ハンドラ
    const handleApplyPreset = (name) => {
        const now = new Date();
        const thisYear = now.getFullYear().toString();
        if (name === "this-year") {
            setSelectedYear(thisYear);
            setSelectedMonth("すべて");
            return;
        }
        if (name === "this-month") {
            const mk = getMonthKey(now);
            setSelectedYear(now.getFullYear().toString());
            setSelectedMonth(mk);
            return;
        }
        if (name === "last-month") {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setSelectedYear(d.getFullYear().toString());
            setSelectedMonth(getMonthKey(d));
            return;
        }
    };

    // ===== 年一覧を生成（yyyy） =====
    const yearOptions = useMemo(() => {
        const years = new Set();
        events.forEach(ev => {
            if (ev.extendedProps.attended || ev.extendedProps.favorite) {
                const y = new Date(ev.date).getFullYear().toString();
                years.add(y);
            }
        });
        return Array.from(years).sort((a, b) => Number(a) - Number(b));
    }, [events]);

    // ===== 月一覧を生成（yyyy/m） — 年フィルタ適用可 =====
    const monthOptions = useMemo(() => {
        const months = new Set();
        events.forEach(ev => {
            if (!(ev.extendedProps.attended || ev.extendedProps.favorite)) return;
            const evYear = new Date(ev.date).getFullYear().toString();
            if (selectedYear !== "すべて" && evYear !== selectedYear) return;
            months.add(getMonthKey(ev.date));
        });
        return Array.from(months).sort((a, b) => parseMonthKeyToDate(a) - parseMonthKeyToDate(b));
    }, [events, selectedYear]);

    /* ===== 表示対象イベント ===== */
    const visibleEvents = useMemo(() => {
        return events.filter(ev => {
            const p = ev.extendedProps;

            if (!p.favorite && !p.attended) return false;
            if (selectedTeam !== "すべて" && p.home !== selectedTeam && p.away !== selectedTeam) return false;
            if (selectedYear !== "すべて" && new Date(ev.date).getFullYear().toString() !== selectedYear) return false;
            if (selectedMonth !== "すべて" && getMonthKey(ev.date) !== selectedMonth) return false;

            return true;
        });
    }, [events, selectedTeam, selectedMonth, selectedYear]);

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

                {/* 年セレクタ */}
                <select
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth("すべて"); }}
                    className="year-select"
                    style={{ marginLeft: 12 }}
                    aria-label="年フィルター"
                >
                    <option key="all" value="すべて">すべての年</option>
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}年</option>
                    ))}
                </select>
            </div>

            {/* ===== 月フィルター（チップUI） ===== */}
            {/* プリセット（今年・今月・先月） */}
            <div className="filter-row preset-container">
                <button className="preset-btn" onClick={() => handleApplyPreset('this-year')}>今年</button>
                <button className="preset-btn" onClick={() => handleApplyPreset('this-month')}>今月</button>
                <button className="preset-btn" onClick={() => handleApplyPreset('last-month')}>先月</button>
            </div>

            <div className="filter-row chip-container" role="tablist" aria-label="月フィルター">
                <button
                    className={selectedMonth === "すべて" ? "chip active" : "chip"}
                    onClick={() => setSelectedMonth("すべて")}
                    aria-pressed={selectedMonth === "すべて"}
                >
                    すべて
                </button>
                {monthOptions.map((m) => (
                    <button
                        key={m}
                        className={selectedMonth === m ? "chip active" : "chip"}
                        onClick={() => setSelectedMonth(m)}
                        aria-pressed={selectedMonth === m}
                    >
                        {formatMonthTitle(m)}
                    </button>
                ))}
            </div>

            {/* ===== 月別サマリー ===== */}
            <div className="monthly-summary">
                <h3>💰 月別支出</h3>
                {Object.entries(monthlySummary)
                    .sort((a, b) => parseMonthKeyToDate(a[0]) - parseMonthKeyToDate(b[0]))
                    .map(([month, total]) => (
                    <div key={month}>
                        {formatMonthTitle(month)}：{total.toLocaleString()} 円
                    </div>
                ))}
            </div>

            {/* ===== 一覧カード（選択: すべて => 月毎にグループ表示 / 月選択 => その月の一覧） ===== */}
            {selectedMonth === "すべて" ? (
                // 月ごとに分けて表示
                monthOptions.length === 0 ? (
                    <div>表示できる月がありません。</div>
                ) : (
                    monthOptions.map((m) => {
                        const eventsForMonth = visibleEvents.filter((ev) => getMonthKey(ev.date) === m);
                        if (eventsForMonth.length === 0) return null;
                        return (
                            <div key={m} className="month-group">
                                <h3 className="month-group-title">{formatMonthTitle(m)}</h3>
                                {eventsForMonth.map((ev) => {
                                    let cardClass = "list-card";
                                    if (ev.extendedProps.attended) {
                                        cardClass += " attended";
                                    } else if (ev.extendedProps.favorite) {
                                        cardClass += " favorite";
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
                                            <div className="list-card-sub">📅 {formatDate(ev.date)} 🏟 {ev.extendedProps.stadium}</div>
                                            <div className="list-card-total">支出：{getEventTotal(ev).toLocaleString()} 円</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )
            ) : (
                // 選択された月のみ表示（ヘッダ付き）
                <div>
                    <h3 className="month-group-title">{formatMonthTitle(selectedMonth)}</h3>
                    {visibleEvents.map((ev) => {
                        let cardClass = "list-card";
                        if (ev.extendedProps.attended) {
                            cardClass += " attended";
                        } else if (ev.extendedProps.favorite) {
                            cardClass += " favorite";
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
                                <div className="list-card-sub">📅 {formatDate(ev.date)} 🏟 {ev.extendedProps.stadium}</div>
                                <div className="list-card-total">支出：{getEventTotal(ev).toLocaleString()} 円</div>
                            </div>
                        );
                    })}
                </div>
            )}

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
