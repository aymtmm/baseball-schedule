import { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import TeamBadge from "../constants/teamBagde";
import TicketSaleForm from "../components/TicketSaleForm";

const STORAGE_KEY_EVENTS = "npb-events";
const STORAGE_KEY_TICKETS = "ticket-sales";

export default function TicketSalesPage() {
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
                setTicketSales(JSON.parse(stored));
            }
        }, []);

        // フォーム送信
        const handleSave = () => {
            if (!ticketSaleDate || selectedGameIds.size === 0) {
                alert("チケット発売日と対象試合を選択してください");
                return;
            }
            const updated = [...ticketSales];
            const existingTicket = updated.find(t => t.saleDate === ticketSaleDate);
            if (existingTicket) {
                const newGameIds = Array.from(selectedGameIds);
                newGameIds.forEach(gId => {
                    if (!existingTicket.games.includes(gId)) {
                        existingTicket.games.push(gId);
                    }
                });
                if (memo) {
                    existingTicket.memo = (existingTicket.memo || "") + (existingTicket.memo ? "\n" : "") + memo;
                }
            } else {
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
            setTicketSaleDate("");
            setSelectedGameIds(new Set());
            setMemo("");
        };

        // 削除
        const handleDelete = (id) => {
            const updated = ticketSales.filter(ts => ts.id !== id);
            setTicketSales(updated);
            localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updated));
        };

        // 編集モーダル
        const openEdit = (sale) => {
            setEditingSale({ ...sale });
        };
        const closeEdit = () => setEditingSale(null);

        const saveEdit = () => {
            if (!editingSale) return;
            let finalTickets = ticketSales.map(t => t.id === editingSale.id ? editingSale : t);
            const others = finalTickets.filter(t => t.id !== editingSale.id);
            const collide = others.find(t => t.saleDate === editingSale.saleDate);
            if (collide) {
                collide.games = Array.from(new Set([...(collide.games || []), ...(editingSale.games || [])]));
                collide.deletedGames = Array.from(new Set([...(collide.deletedGames || []), ...(editingSale.deletedGames || [])]));
                collide.memo = [collide.memo, editingSale.memo].filter(Boolean).join('\n');
                finalTickets = others.map(t => t.id === collide.id ? collide : t);
            }
            setTicketSales(finalTickets);
            localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(finalTickets));
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
    const [events, setEvents] = useState([]);
    const [ticketSaleDate, setTicketSaleDate] = useState("");
    const [filterGameDate, setFilterGameDate] = useState("");
    const [selectedGameIds, setSelectedGameIds] = useState(new Set());
    const [memo, setMemo] = useState("");
    const [ticketSales, setTicketSales] = useState([]);
    const [editingSale, setEditingSale] = useState(null);
    const [showNewModal, setShowNewModal] = useState(false);
    return (
        <div className="page-container">
            <h2 className="page-title">🎫 チケット発売日管理</h2>
            <button
                style={{ marginBottom: 16, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, fontWeight: 'bold', width: '100%' }}
                onClick={() => setShowNewModal(true)}
            >
                新規発売日登録
            </button>
            {showNewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={()=>setShowNewModal(false)}>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420 }} onClick={e=>e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>発売日新規登録</h3>
                        <TicketSaleForm
                            saleDate={ticketSaleDate}
                            setSaleDate={setTicketSaleDate}
                            filterGameDate={filterGameDate}
                            setFilterGameDate={setFilterGameDate}
                            events={events}
                            selectedGameIds={selectedGameIds}
                            setSelectedGameIds={setSelectedGameIds}
                            memo={memo}
                            setMemo={setMemo}
                            onSave={() => { handleSave(); setShowNewModal(false); }}
                        />
                        <button onClick={()=>setShowNewModal(false)} style={{ marginTop: 12, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', width: '100%' }}>キャンセル</button>
                    </div>
                </div>
            )}

            {/* 登録済みリスト */}
            <h3>登録済み発売日</h3>
            {ticketSales.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#999" }}>
                    登録されたチケット発売日はありません
                </div>
            ) : (
                [...ticketSales]
                    .sort((a, b) => {
                        if (!a.saleDate) return 1;
                        if (!b.saleDate) return -1;
                        return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
                    })
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
                        <TicketSaleForm
                            saleDate={editingSale.saleDate}
                            setSaleDate={v => setEditingSale({ ...editingSale, saleDate: v })}
                            filterGameDate={filterGameDate}
                            setFilterGameDate={setFilterGameDate}
                            events={events}
                            selectedGameIds={new Set(editingSale.games || [])}
                            setSelectedGameIds={set => setEditingSale({ ...editingSale, games: Array.from(set) })}
                            memo={editingSale.memo}
                            setMemo={v => setEditingSale({ ...editingSale, memo: v })}
                            isEdit={true}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="primary-btn" onClick={saveEdit}>保存</button>
                            <button onClick={closeEdit} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', width: '100%' }}>キャンセル</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
