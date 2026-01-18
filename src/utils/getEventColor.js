export const getEventColor = (ev) => {
    if (!ev || !ev.extendedProps) return "#90CAF9";

    if (ev.extendedProps.attended) {
        return "#A5D6A7"; // 観戦済み：緑
    }

    if (ev.extendedProps.favorite) {
        return "#FFE082"; // お気に入り：黄色
    }

    return "#90CAF9"; // デフォルト：青
};
