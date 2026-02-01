import TeamBadge from "../constants/teamBagde";

/**
 * チケット発売日・対象試合選択・メモ入力の共通フォーム
 * props:
 * - saleDate, setSaleDate
 * - filterGameDate, setFilterGameDate
 * - events
 * - selectedGameIds, setSelectedGameIds
 * - memo, setMemo
 * - onSave (optional)
 * - isEdit (optional)
 */
export default function TicketSaleForm({
  saleDate,
  setSaleDate,
  filterGameDate,
  setFilterGameDate,
  events,
  selectedGameIds,
  setSelectedGameIds,
  memo,
  setMemo,
  onSave,
  isEdit = false,
}) {
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

  const formatGameDate = (dateStr) => {
    const str = typeof dateStr === "string" ? dateStr.substring(0, 10) : dateStr;
    const [y, m, d] = str.split("-");
    const date = new Date(y, m - 1, d);
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    return `${m}月${d}日（${dayNames[date.getDay()]}）`;
  };

  return (
    <>
      {/* チケット発売日（date input） */}
      <div className="form-row" style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: "bold" }}>🎫 チケット発売日</label>
        <input
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          className="money-input"
        />
      </div>

      {/* 試合フィルター用日付入力 */}
      {saleDate && (
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
        {!saleDate ? (
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
              .filter((game) => {
                const gameDate =
                  typeof game.date === "string"
                    ? game.date.substring(0, 10)
                    : new Date(game.date).toISOString().substring(0, 10);
                // フィルター日付の試合のみ表示、かつ発売日以降
                return gameDate === filterGameDate && gameDate >= saleDate;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            return filteredGames.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#999" }}>
                この日付に該当する試合はありません
              </div>
            ) : (
              filteredGames.map((game) => (
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
                    cursor: "pointer",
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

      {/* 保存ボタン（新規登録時のみ） */}
      {!isEdit && onSave && (
        <button
          onClick={onSave}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          登録
        </button>
      )}
    </>
  );
}
