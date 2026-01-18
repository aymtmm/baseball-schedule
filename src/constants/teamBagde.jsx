const TEAM_ICON_MAP = {
    ソフトバンク: "hawks",
    日本ハム: "fighters",
    巨人: "giants",
    阪神: "tigers",
    DeNA: "baystars",
    中日: "dragons",
    ロッテ: "marines",
    楽天: "eagles"
};

export default function TeamBadge({
                                      team,
                                      showName = true,
                                      size = 20,
                                      fontSize = 14
                                  }) {
    const key = TEAM_ICON_MAP[team];

    if (!key) {
        return (
            <span style={{ fontSize, fontWeight: "bold" }}>
        {showName ? team : team[0]}
      </span>
        );
    }

    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6
        }}>
      <img src={`/teams/${key}.svg`} alt={team} width={size} height={size} />
            {showName && <span style={{ fontSize }}>{team}</span>}
    </span>
    );
}

