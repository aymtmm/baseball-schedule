import TeamBadge from "../constants/teamBagde";

function GameModal({
                       event,
                       onClose,
                       onUpdate,
                       getEventColor,
                       getEventTotal
                   }) {
    if (!event) return null;

    const ep = event.extendedProps;
    const cost = ep.cost;

    const update = (path, value) => {
        const updated = structuredClone(event);

        let target = updated.extendedProps;
        const keys = path.split(".");
        keys.slice(0, -1).forEach(k => target = target[k]);
        target[keys.at(-1)] = value;

        onUpdate(updated);
    };

    const handleBlurMoney = (path) => {
        const value = path.split(".").reduce((o, k) => o[k], event.extendedProps);
        update(path, Number(value || 0).toLocaleString());
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: getEventColor(event),
                    padding: "16px",
                    textAlign: "left",
                    borderRadius: "12px",
                    width: "90%",
                    maxWidth: "420px",
                    maxHeight: "90%",
                    overflowY: "auto"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <h2 style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <TeamBadge team={ep.home} size={26} fontSize={17} />
                        <span>vs</span>
                        <TeamBadge team={ep.away} size={26} fontSize={17} />
                    </h2>
                    <button onClick={onClose}>×</button>
                </div>

                <strong>{event.date ? formatDate(event.date) : ""} {ep.startTime}</strong>
                <div>🏟 {ep.stadium}</div>

                {/* フラグ */}
                <div className="checkbox-row">
                    <label>
                        <input
                            type="checkbox"
                            checked={ep.favorite}
                            onChange={e => update("favorite", e.target.checked)}
                        />
                        ⭐ お気に入り
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={ep.attended}
                            onChange={e => update("attended", e.target.checked)}
                        />
                        ✅ 観戦済み
                    </label>
                </div>

                {/* 観戦済みのみ表示 */}
                {ep.attended && (
                    <div className="form-section">

                        {/* チケット */}
                        <FormMoney
                            label="🎫 チケット"
                            value={cost.ticket}
                            onChange={v => update("cost.ticket", v)}
                            onBlur={() => handleBlurMoney("cost.ticket")}
                        />

                        {/* ビール */}
                        <FormMoney
                            label="🍺 ビール"
                            value={cost.beerCost}
                            onChange={v => update("cost.beerCost", v)}
                            onBlur={() => handleBlurMoney("cost.beerCost")}
                        />

                        <FormNumber
                            value={cost.beerCount}
                            unit="杯"
                            onChange={v => update("cost.beerCount", v)}
                        />

                        <FormMoney
                            label="🍔 球場飯"
                            value={cost.ballparkFood}
                            onChange={v => update("cost.ballparkFood", v)}
                            onBlur={() => handleBlurMoney("cost.ballparkFood")}
                        />

                        <FormMoney
                            label="🎁 グッズ"
                            value={cost.goods}
                            onChange={v => update("cost.goods", v)}
                            onBlur={() => handleBlurMoney("cost.goods")}
                        />

                        <FormMoney
                            label="🚄 遠征費"
                            value={cost.travelCost}
                            onChange={v => update("cost.travelCost", v)}
                            onBlur={() => handleBlurMoney("cost.travelCost")}
                        />

                        {/* 先発 */}
                        <div className="form-row">
                            <div className="form-label">🎯 先発</div>
                            <div className="form-field column">
                                <input
                                    placeholder="ホーム"
                                    value={ep.startingPitcher.home}
                                    onChange={e => update("startingPitcher.home", e.target.value)}
                                />
                                <input
                                    placeholder="ビジター"
                                    value={ep.startingPitcher.away}
                                    onChange={e => update("startingPitcher.away", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* メモ */}
                        <div className="form-row">
                            <div className="form-label">📝 メモ</div>
                            <input
                                value={ep.memo}
                                onChange={e => update("memo", e.target.value)}
                            />
                        </div>

                        <div className="total">
                            合計支出：{getEventTotal(event).toLocaleString()} 円
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ===== 小コンポーネント ===== */

const FormMoney = ({ label, value, onChange, onBlur }) => (
    <div className="form-row">
        <div className="form-label">{label}</div>
        <div className="form-field inline">
            <input
                className="money-input"
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
            />
            <span>円</span>
        </div>
    </div>
);

const FormNumber = ({ value, unit, onChange }) => (
    <div className="form-row">
        <div className="form-label"></div>
        <div className="form-field inline">
            <input
                type="number"
                className="money-input"
                value={value}
                min="0"
                onChange={e => onChange(e.target.value)}
            />
            <span>{unit}</span>
        </div>
    </div>
);

export default GameModal;
