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

const saveTicketSales = (tickets) => {
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
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

const STORAGE_KEY_TICKETS = "ticket-sales";

export default function CalenderPage({ setCurrentTab }) {
    const [events, setEvents] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState("ソフトバンク");
    const [modalEventId, setModalEventId] = useState(null);
    const [ticketSales, setTicketSales] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [addTypeModal, setAddTypeModal] = useState(false); // 試合/発売日選択

    const modalEvent = events.find(e => e.id === modalEventId);

    // ticket salesを読み込む
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_TICKETS);
        if (stored) {
            let parsed = JSON.parse(stored);

            // 同一の saleDate をマージして、同日分を1つのカードにまとめる
            const mergedMap = parsed.reduce((acc, t) => {
                const key = t.saleDate;
                if (!acc[key]) {
                    acc[key] = {
                        id: t.id || `ticket-${Date.now()}`,
                        saleDate: t.saleDate,
                        games: Array.isArray(t.games) ? [...t.games] : [],
                        deletedGames: Array.isArray(t.deletedGames) ? [...t.deletedGames] : [],
                        memo: t.memo || ""
                    };
                } else {
                    const cur = acc[key];
                    (t.games || []).forEach(g => { if (!cur.games.includes(g)) cur.games.push(g); });
                    (t.deletedGames || []).forEach(d => { if (!cur.deletedGames.includes(d)) cur.deletedGames.push(d); });
                    if (t.memo) cur.memo = cur.memo ? `${cur.memo}\n${t.memo}` : t.memo;
                }
                return acc;
            }, {});

            const merged = Object.values(mergedMap);

            // 保存されている配列と異なる場合は上書き保存
            if (JSON.stringify(merged) !== JSON.stringify(parsed)) {
                localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(merged));
                parsed = merged;
            }

            setTicketSales(parsed);

            // npb-events 側と同期：チケットに紐づく試合に ticketStartDate を設定
            const evStored = localStorage.getItem(STORAGE_KEY);
            if (evStored) {
                const evParsed = JSON.parse(evStored);
                const updatedEvents = evParsed.map(ev => {
                    const existing = parsed.find(t => (t.games || []).includes(ev.id));
                    return {
                        ...ev,
                        extendedProps: {
                            ...ev.extendedProps,
                            ticketStartDate: existing ? existing.saleDate : (ev.extendedProps && ev.extendedProps.ticketStartDate) || ""
                        }
                    };
                });
                setEvents(updatedEvents);
                saveEvents(updatedEvents);
            }
        }
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("npb-events");

        if (stored) {
            const parsed = JSON.parse(stored);
            // 全てのイベントに確実にticketStartDateを追加（既存値を保持）
            const updated = parsed.map(ev => ({
                ...ev,
                extendedProps: {
                    ...ev.extendedProps,
                    ticketStartDate: ev.extendedProps.ticketStartDate || ""
                }
            }));
            setEvents(updated);
            // 必要に応じて保存
            if (JSON.stringify(parsed) !== JSON.stringify(updated)) {
                saveEvents(updated);
            }
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
                        ticketStartDate: "",
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
        const evId = arg.event.id;
        const isTicket = evId.startsWith("ticket-");
        
        if (isTicket) {
            const ticket = ticketSales.find(t => `ticket-${t.id}` === evId);
            return (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    fontSize: 11,
                    lineHeight: 1.25
                }}>
                    <div>🎫 チケット発売</div>
                    {ticket && (
                        <div style={{ fontSize: 9, color: "#555" }}>
                            {ticket.games?.length || 0}試合
                        </div>
                    )}
                </div>
            );
        }

        const ev = events.find(e => e.id === arg.event.id);
        if (!ev) return null;
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

    // 発売日イベントに変換
    const ticketSaleEvents = useMemo(() => {
        return ticketSales.map(ticket => ({
            id: `ticket-${ticket.id}`,
            title: "🎫 チケット発売",
            date: ticket.saleDate,
            extendedProps: { 
                isTicketSale: true, 
                ticketData: ticket 
            }
        }));
    }, [ticketSales]);

    const filteredEvents = useMemo(() => {
        const allEvents = [...events, ...ticketSaleEvents];
        if (selectedTeam === "すべて") return allEvents;

        return allEvents.filter(ev => {
            // 発売日イベントは常に表示
            if (ev.extendedProps.isTicketSale) return true;
            // 試合イベントはチーム絞り込みを適用
            return ev.extendedProps.home === selectedTeam ||
                ev.extendedProps.away === selectedTeam;
        });
    }, [events, ticketSaleEvents, selectedTeam]);

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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, display: 'inline-block', background: '#CE93D8', borderRadius: 2 }}></span>
                    <small>チケット発売</small>
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
                        ev.extendedProps.isTicketSale ? "ticket-sale" : (
                            ev.extendedProps.attended ? "attended" :
                                ev.extendedProps.favorite ? "favorite" : "default"
                        )
                    ],
                    backgroundColor: ev.extendedProps.isTicketSale ? "#CE93D8" : getEventColor(ev),
                    borderColor: ev.extendedProps.isTicketSale ? "#CE93D8" : getEventColor(ev),
                    textColor: '#111'
                }))}
                eventContent={eventContent}
                eventClick={(info) => {
                    const evId = info.event.id;
                    if (!evId.startsWith("ticket-")) {
                        setModalEventId(evId);
                    }
                    // チケット発売イベントはクリックしても何もしない（将来的に詳細モーダル可能）
                }}
                dateClick={(info) => {
                    // セルクリックで「試合/発売日」選択モーダル
                    const dateStr = info.dateStr;
                    setSelectedDate(dateStr);
                    setAddTypeModal(true);
                }}
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
                    // イベントデータを保存
                    setEvents((prev) => {
                        const next = prev.map((ev) =>
                            ev.id === updatedEvent.id ? updatedEvent : ev
                        );
                        saveEvents(next);
                        return next;
                    });
                    
                    // ticketStartDateが入力されたら、ticket salesの自動作成
                    const newTicketStartDate = updatedEvent.extendedProps.ticketStartDate;
                    const oldTicketStartDate = modalEvent?.extendedProps?.ticketStartDate || "";
                    
                    // 新しい発売日が入力された場合
                    if (newTicketStartDate && newTicketStartDate !== oldTicketStartDate) {
                        setTicketSales((prevTickets) => {
                            let updated = [...prevTickets];
                            
                            // 同じ発売日のticket saleを探す
                            let targetTicket = updated.find(t => t.saleDate === newTicketStartDate);
                            
                            if (targetTicket) {
                                // 既存のticket saleに追加（重複をチェック）
                                if (!targetTicket.games.includes(updatedEvent.id)) {
                                    targetTicket.games.push(updatedEvent.id);
                                }
                            } else {
                                // 新しいticket saleを作成
                                const newTicket = {
                                    id: `ticket-${Date.now()}`,
                                    saleDate: newTicketStartDate,
                                    games: [updatedEvent.id],
                                    deletedGames: [],
                                    memo: ""
                                };
                                updated.push(newTicket);
                            }
                            
                            saveTicketSales(updated);
                            return updated;
                        });
                    }
                    // 古いticketStartDateが削除された場合、ticket saleから削除
                    else if (oldTicketStartDate && !newTicketStartDate) {
                        setTicketSales((prevTickets) => {
                            const updated = prevTickets.map(t => {
                                if (t.saleDate === oldTicketStartDate) {
                                    return {
                                        ...t,
                                        games: t.games.filter(gid => gid !== updatedEvent.id)
                                    };
                                }
                                return t;
                            }).filter(t => t.games.length > 0);
                            
                            saveTicketSales(updated);
                            return updated;
                        });
                    }
                }}
                getEventColor={(ev) => getEventColor(ev, selectedTeam)}
                getEventTotal={getEventTotal}
            />

            {/* 試合/発売日選択モーダル */}
            {addTypeModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        background: "white",
                        padding: 24,
                        borderRadius: 12,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        textAlign: "center",
                        maxWidth: 300
                    }}>
                        <h3 style={{ marginBottom: 16 }}>
                            {selectedDate && new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                        </h3>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button
                                onClick={() => {
                                    setAddTypeModal(false);
                                    // 試合追加の場合、GameModalを開く
                                    // 将来実装：新規試合モーダル
                                    alert("試合の追加機能は後で実装します");
                                }}
                                style={{
                                    padding: "10px 16px",
                                    border: "none",
                                    borderRadius: 6,
                                    background: "#42A5F5",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: 14
                                }}
                            >
                                ⚾ 試合追加
                            </button>
                            <button
                                onClick={() => {
                                    setAddTypeModal(false);
                                    // TicketSalesページへ遷移
                                    if (setCurrentTab) {
                                        setCurrentTab("tickets");
                                    }
                                }}
                                style={{
                                    padding: "10px 16px",
                                    border: "none",
                                    borderRadius: 6,
                                    background: "#CE93D8",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: 14
                                }}
                            >
                                🎫 発売日追加
                            </button>
                        </div>
                        <button
                            onClick={() => setAddTypeModal(false)}
                            style={{
                                marginTop: 12,
                                padding: "8px 16px",
                                border: "1px solid #ccc",
                                borderRadius: 6,
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12
                            }}
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
