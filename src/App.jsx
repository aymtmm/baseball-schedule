import { useState } from "react";
import CalenderPage from "./pages/CalenderPage";
import ListPage from "./pages/ListPage";
import TicketSalesPage from "./pages/TicketSalesPage";

export default function App() {
    const [currentTab, setCurrentTab] = useState("calendar");

    return (
        <div style={{ paddingBottom: "60px" }}> {/* タブ分の余白を確保 */}
            {currentTab === "calendar" && <CalenderPage setCurrentTab={setCurrentTab} />}
            {currentTab === "list" && <ListPage />}
            {currentTab === "tickets" && <TicketSalesPage />}

            {/* 下タブバー */}
            <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                width: "100%",
                display: "flex",
                borderTop: "1px solid #ccc",
                background: "#f8f8f8", // タブの背景色
                height: 56,
                zIndex: 1000
            }}>
                <button
                    style={{
                        flex: 1,
                        fontWeight: currentTab === "calendar" ? "bold" : "normal",
                        background: currentTab === "calendar" ? "#d1eaff" : "transparent", // 選択中色
                        border: "none",
                        cursor: "pointer"
                    }}
                    onClick={() => setCurrentTab("calendar")}
                >
                    カレンダー
                </button>
                <button
                    style={{
                        flex: 1,
                        fontWeight: currentTab === "list" ? "bold" : "normal",
                        background: currentTab === "list" ? "#d1eaff" : "transparent", // 選択中色
                        border: "none",
                        cursor: "pointer"
                    }}
                    onClick={() => setCurrentTab("list")}
                >
                    一覧
                </button>
                <button
                    style={{
                        flex: 1,
                        fontWeight: currentTab === "tickets" ? "bold" : "normal",
                        background: currentTab === "tickets" ? "#d1eaff" : "transparent", // 選択中色
                        border: "none",
                        cursor: "pointer"
                    }}
                    onClick={() => setCurrentTab("tickets")}
                >
                    🎫 発売日
                </button>
            </div>
        </div>
    );
}
