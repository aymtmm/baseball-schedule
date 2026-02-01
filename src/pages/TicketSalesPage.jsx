import { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import TeamBadge from "../constants/teamBagde";

const STORAGE_KEY_EVENTS = "npb-events";
const STORAGE_KEY_TICKETS = "ticket-sales";

export default function TicketSalesPage() {
    const [events, setEvents] = useState([]);
    const [ticketSales, setTicketSales] = useState([]);
    const [ticketSaleDate, setTicketSaleDate] = useState(""); // チケット発売日
    const [filterGameDate, setFilterGameDate] = useState(""); // 試合フィルター用
    const [selectedGameIds, setSelectedGameIds] = useState(new Set()); // 発売対象試合
    const [memo, setMemo] = useState("");
    const [editingSale, setEditingSale] = useState(null); // for edit modal

    // イベント読み込み
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
        if (stored) {
            setEvents(JSON.parse(stored));
        }
    }, []);

    // チケット発売データ読み込み
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_TICKETS);
        if (stored) {
            const parsed = JSON.parse(stored);
            setTicketSales(parsed);
        }
        // check for prefill from calendar long-press
        const pre = localStorage.getItem('ticket-new-prefill');
        if (pre) {
            setTicketSaleDate(pre);
            localStorage.removeItem('ticket-new-prefill');
        }
    }, []);

    // フォーム送信
    const handleSave = () => {
        if (!ticketSaleDate || selectedGameIds.size === 0) {
            alert("チケット発売日と対象試合を選択してください");
            return;
        }

        const updated = [...ticketSales];
        
        // 同じ発売日のチケットセールを探す
        const existingTicket = updated.find(t => t.saleDate === ticketSaleDate);
        
        if (existingTicket) {
            // 既存のカードに試合を追加（重複を避ける）
            const newGameIds = Array.from(selectedGameIds);
            newGameIds.forEach(gId => {
                if (!existingTicket.games.includes(gId)) {
                    existingTicket.games.push(gId);
                }
            });
            // メモがあればアップデート
            if (memo) {
                existingTicket.memo = (existingTicket.memo || "") + (existingTicket.memo ? "\n" : "") + memo;
            }
        } else {
            // 新しいカードを作成
            const newSale = {
                id: `ticket-${Date.now()}`,
                saleDate: ticketSaleDate,
                games: Array.from(selectedGameIds),
                deletedGames: [],
                memo
            };
            updated.push(newSale);
        }

        setTicketSales(updated);
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));

        // フォームをリセット
        setTicketSaleDate("");
        setSelectedGameIds(new Set());
        setMemo("");
    };

    // 試合選択トグル
    const toggleGameSelection = (gameId) => {
        const newSet = new Set(selectedGameIds);
        if (newSet.has(gameId)) {
            newSet.delete(gameId);
        } else {
            newSet.add(gameId);
        }
        setSelectedGameIds(newSet);
    };

    // 削除
    const handleDelete = (id) => {
        const updated = ticketSales.filter(ts => ts.id !== id);
        setTicketSales(updated);
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));
    };

    // Open edit modal for a sale
    const openEdit = (sale) => {
        setEditingSale({ ...sale });
    };

    const closeEdit = () => setEditingSale(null);

    const saveEdit = () => {
        if (!editingSale) return;
        // Build final ticketSales array with edited sale applied
        let finalTickets = ticketSales.map(t => t.id === editingSale.id ? editingSale : t);

        // If edited saleDate collides with existing other sale, merge into that one
        const others = finalTickets.filter(t => t.id !== editingSale.id);
        const collide = others.find(t => t.saleDate === editingSale.saleDate);
        if (collide) {
            // merge games/memo/deletedGames
            collide.games = Array.from(new Set([...(collide.games || []), ...(editingSale.games || [])]));
            collide.deletedGames = Array.from(new Set([...(collide.deletedGames || []), ...(editingSale.deletedGames || [])]));
            collide.memo = [collide.memo, editingSale.memo].filter(Boolean).join('\n');
            // remove the editedSale entry
            finalTickets = others.map(t => t.id === collide.id ? collide : t);
        }

        setTicketSales(finalTickets);
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(finalTickets));

        // sync to npb-events: update ticketStartDate for affected games using local events state
        if (events && events.length > 0) {
            const updatedEvents = events.map(ev => {
                const ts = finalTickets.find(t => (t.games || []).includes(ev.id));
                return {
                    ...ev,
                    extendedProps: {
                        ...ev.extendedProps,
                        ticketStartDate: ts ? ts.saleDate : (ev.extendedProps && ev.extendedProps.ticketStartDate) || ''
                    }
                };
            });
            setEvents(updatedEvents);
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updatedEvents));
        }

        closeEdit();
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        return `${month}月${date}日（${dayNames[d.getDay()]}）`;
    };

    const formatGameDate = (dateStr) => {
        const str = typeof dateStr === 'string' ? dateStr.substring(0, 10) : dateStr;
        const [y, m, d] = str.split('-');
        const date = new Date(y, m - 1, d);
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        return `${m}月${d}日（${dayNames[date.getDay()]}）`;
    };

    return (
        <div className="page-container">
            <h2 className="page-title">🎫 チケット発売日管理</h2>

            {/* 入力フォーム */}
            <div style={{ 
                background: "#f9f9f9", 
                padding: "12px", 
                borderRadius: "8px", 
                marginBottom: "16px" 
            }}>
                <h3 style={{ marginTop: 0 }}>新規登録</h3>

                {/* チケット発売日（date input） */}
                <div className="form-row" style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: "bold" }}>🎫 チケット発売日</label>
                    <input
                        type="date"
                        value={ticketSaleDate}
                        onChange={(e) => setTicketSaleDate(e.target.value)}
                        className="money-input"
                    />
                </div>

                {/* 試合フィルター用日付入力 */}
                {ticketSaleDate && (
                    <div className="form-row" style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: "bold" }}>試合検索日</label>
                        <input
                            type="date"
                            value={filterGameDate}
                            onChange={(e) => setFilterGameDate(e.target.value)}
                            className="money-input"
                        />
                    </div>
                )}

                {/* 発売対象試合選択 */}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: "bold", display: "block", marginBottom: 8 }}>
                        発売対象試合を選択
                    </label>
                    {!ticketSaleDate ? (
                        <div style={{ fontSize: "12px", color: "#999" }}>
                            先にチケット発売日を選択してください
                        </div>
                    ) : !filterGameDate ? (
                        <div style={{ fontSize: "12px", color: "#999" }}>
                            カレンダーから試合検索日を選択してください
                        </div>
                    ) : (
                        (() => {
                            const filteredGames = events
                                .filter(game => {
                                    const gameDate = typeof game.date === 'string' 
                                        ? game.date.substring(0, 10)
                                        : new Date(game.date).toISOString().substring(0, 10);
                                    // フィルター日付の試合のみ表示、かつ発売日以降
                                    return gameDate === filterGameDate && gameDate >= ticketSaleDate;
                                })
                                .sort((a, b) => new Date(a.date) - new Date(b.date));

                            return filteredGames.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "#999" }}>
                                    この日付に該当する試合はありません
                                </div>
                            ) : (
                                filteredGames.map(game => (
                                    <label
                                        key={game.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: 8,
                                            background: "#fff",
                                            borderRadius: 4,
                                            marginBottom: 4,
                                            cursor: "pointer"
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedGameIds.has(game.id)}
                                            onChange={() => toggleGameSelection(game.id)}
                                        />
                                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                            <TeamBadge team={game.extendedProps.home} size={18} fontSize={12} />
                                            <span>vs</span>
                                            <TeamBadge team={game.extendedProps.away} size={18} fontSize={12} />
                                        </div>
                                        <span style={{ fontSize: "12px", color: "#666" }}>
                                            {formatGameDate(game.date)} @ {game.extendedProps.stadium}
                                        </span>
                                    </label>
                                ))
                            );
                        })()
                    )}
                </div>

                {/* メモ */}
                <div className="form-row" style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: "bold" }}>メモ（任意）</label>
                    <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="例：先行抽選、先着順"
                        className="money-input"
                    />
                </div>

                {/* 保存ボタン */}
                <button
                    onClick={handleSave}
                    style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    登録
                </button>
            </div>

            {/* 登録済みリスト */}
            <h3>登録済み発売日</h3>
            {ticketSales.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#999" }}>
                    登録されたチケット発売日はありません
                </div>
            ) : (
                ticketSales
                    .sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate))
                    .map(sale => {
                        const saleGames = events.filter(ev => sale.games.includes(ev.id));
                        return (
                            <div key={sale.id} className="ticket-card" onClick={() => openEdit(sale)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="ticket-card-title">🎫 発売日: {formatDate(sale.saleDate)}</div>
                                    {sale.deletedGames && sale.deletedGames.length > 0 && (
                                        <div style={{ background: '#ffe6e6', color: '#c92a2a', padding: '4px 8px', borderRadius: 999, fontSize: 12 }}>
                                            払い戻し要: {sale.deletedGames.length}
                                        </div>
                                    )}
                                </div>
                                <div className="ticket-card-meta">
                                    <div style={{ fontWeight: "bold", marginBottom: 6 }}>対象試合:</div>
                                    {saleGames.map((game, idx) => (
                                        <div key={game.id} style={{ marginLeft: 8 }}>
                                            {idx + 1}. {game.extendedProps.home} vs {game.extendedProps.away} ({formatGameDate(game.date)})
                                        </div>
                                    ))}
                                </div>
                                {sale.memo && (
                                    <div style={{ fontSize: "12px", color: "#666", marginBottom: 8 }}>
                                        メモ: {sale.memo}
                                    </div>
                                )}
                                <button onClick={() => handleDelete(sale.id)} className="ticket-delete-btn">削除</button>
                            </div>
                        );
                    })
            )}
            {/* Edit modal */}
            {editingSale && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={closeEdit}>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420 }} onClick={e=>e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>発売日編集</h3>
                        <div className="form-row">
                            <label>発売日</label>
                            <input type="date" value={editingSale.saleDate} onChange={e=>setEditingSale({...editingSale, saleDate: e.target.value})} />
                        </div>
                        <div className="form-row">
                            <label>メモ</label>
                            <input type="text" value={editingSale.memo} onChange={e=>setEditingSale({...editingSale, memo: e.target.value})} />
                        </div>
                        <div className="form-row">
                            <label>対象試合を選択</label>
                            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 8 }}>
                                {events
                                    .slice()
                                    .sort((a,b)=> new Date(a.date) - new Date(b.date))
                                    .map(ev => {
                                        const isChecked = (editingSale.games || []).includes(ev.id);
                                        return (
                                            <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const cur = new Set(editingSale.games || []);
                                                        if (cur.has(ev.id)) cur.delete(ev.id);
                                                        else cur.add(ev.id);
                                                        setEditingSale({ ...editingSale, games: Array.from(cur) });
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <TeamBadge team={ev.extendedProps.home} size={16} fontSize={12} />
                                                    <span>vs</span>
                                                    <TeamBadge team={ev.extendedProps.away} size={16} fontSize={12} />
                                                </div>
                                                <div style={{ fontSize: 12, color: '#666' }}>{formatGameDate(ev.date)} @ {ev.extendedProps.stadium}</div>
                                            </label>
                                        );
                                    })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="primary-btn" onClick={saveEdit}>保存</button>
                            <button onClick={closeEdit} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}>キャンセル</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
