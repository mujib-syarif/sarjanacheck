// Sarjana Checker API
const COC_API = "https://cocproxy.royaleapi.dev/v1";
const ALLOWED_ORIGIN = "https://mujib-syarif.github.io";

function headers(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=UTF-8"
  };
}

function response(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: headers(origin)
  });
}

function cleanTag(tag) {
  return decodeURIComponent(tag).trim().toUpperCase();
}

async function getCoC(path, token) {
  const res = await fetch(`${COC_API}${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  let data;

  try {
    data = await res.json();
  } catch {
    data = {
      error: "Response API bukan JSON."
    };
  }

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}


// ======================================================
// NORMALIZE MEMBER CWL
// ======================================================

function normalizeWarMember(member, attacksPerMember = 1) {

  const attacks = Array.isArray(member.attacks)
    ? member.attacks
    : [];

  const attackCount = attacks.length;

  const stars = attacks.reduce(
    (total, attack) => total + (Number(attack.stars) || 0),
    0
  );

  const destruction = attacks.reduce(
    (total, attack) =>
      total + (Number(attack.destructionPercentage) || 0),
    0
  );

  const missed =
    attackCount < Number(attacksPerMember || 1);

  return {
    tag: member.tag || "",
    name: member.name || "",
    townHallLevel: member.townhallLevel || 0,
    mapPosition: member.mapPosition || 0,

    attacks: attackCount,
    attacksExpected: Number(attacksPerMember || 1),
    missed,

    stars,
    destructionPercentage: Math.round(destruction * 100) / 100,

    rawAttacks: attacks
  };
}


// ======================================================
// NORMALIZE CLAN WAR
// ======================================================

function normalizeWar(war, clanTag, roundIndex) {

  const clans = Array.isArray(war.clan) && war.clan
    ? [war.clan]
    : [];

  const ourClan =
    war.clan?.tag?.toUpperCase() === clanTag
      ? war.clan
      : war.opponent;

  const opponentClan =
    war.clan?.tag?.toUpperCase() === clanTag
      ? war.opponent
      : war.clan;

  if (!ourClan || !opponentClan) {
    return {
      round: roundIndex,
      warTag: war.tag || "",
      state: war.state || "unknown",
      available: false,
      error: "Clan tidak ditemukan dalam war ini."
    };
  }

  const attacksPerMember =
    Number(war.attacksPerMember || 1);

  const members = Array.isArray(ourClan.members)
    ? ourClan.members
    : [];

  const normalizedMembers = members.map(member =>
    normalizeWarMember(
      member,
      attacksPerMember
    )
  );

  const totalStars = normalizedMembers.reduce(
    (total, member) => total + member.stars,
    0
  );

  const totalDestruction = Number(
    ourClan.destructionPercentage || 0
  );

  const totalAttacks = normalizedMembers.reduce(
    (total, member) => total + member.attacks,
    0
  );

  const missedAttacks = normalizedMembers.filter(
    member => member.missed
  ).length;

  return {

    round: roundIndex,

    warTag: war.tag || "",

    state: war.state || "unknown",

    teamSize:
      Number(war.teamSize || members.length || 0),

    attacksPerMember,

    startTime: war.startTime || null,
    endTime: war.endTime || null,

    clan: {
      tag: ourClan.tag || "",
      name: ourClan.name || "",
      clanLevel: ourClan.clanLevel || 0,
      stars: Number(ourClan.stars || 0),
      destructionPercentage: totalDestruction,

      membersCount: members.length,

      totalAttacks,
      missedAttacks,

      members: normalizedMembers
    },

    opponent: {
      tag: opponentClan.tag || "",
      name: opponentClan.name || "",
      clanLevel: opponentClan.clanLevel || 0,
      stars: Number(opponentClan.stars || 0),
      destructionPercentage:
        Number(opponentClan.destructionPercentage || 0),

      membersCount:
        Array.isArray(opponentClan.members)
          ? opponentClan.members.length
          : 0
    }
  };
}


// ======================================================
// MAIN WORKER
// ======================================================

export default {

  async fetch(request, env) {

    const origin =
      request.headers.get("Origin") || "";

    // ==================================================
    // CORS PREFLIGHT
    // ==================================================

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: headers(origin)
      });

    }


    // ==================================================
    // ONLY GET
    // ==================================================

    if (request.method !== "GET") {

      return response(
        {
          error: "Method tidak diizinkan."
        },
        405,
        origin
      );

    }


    // ==================================================
    // TOKEN CHECK
    // ==================================================

    if (!env.COC_API_TOKEN) {

      return response(
        {
          error:
            "COC_API_TOKEN belum terpasang di Worker."
        },
        500,
        origin
      );

    }


    const url = new URL(request.url);

    const path =
      url.pathname.replace(/\/+$/, "");


    // ==================================================
    // HOME / STATUS
    // ==================================================

    if (path === "") {

      return response(
        {
          status: "online",
          service:
            "Clash of Clans Tag Tracker API",
          by: "Mujib, S.Coc.",

          endpoints: [
            "/",
            "/player?tag=%239UG9LJV8Y",
            "/clan?tag=%232J0P2GR08",
            "/cwl?tag=%232J0P2GR08"
          ]
        },
        200,
        origin
      );

    }


    // ==================================================
    // PLAYER
    // /player?tag=%239UG9LJV8Y
    // ==================================================

    if (path === "/player") {

      const rawTag =
        url.searchParams.get("tag");

      if (!rawTag) {

        return response(
          {
            error:
              "Player tag belum diberikan."
          },
          400,
          origin
        );

      }

      const tag =
        cleanTag(rawTag);

      if (!tag.startsWith("#")) {

        return response(
          {
            error:
              "Player tag harus diawali #."
          },
          400,
          origin
        );

      }

      try {

        const result = await getCoC(
          `/players/${encodeURIComponent(tag)}`,
          env.COC_API_TOKEN
        );

        if (!result.ok) {

          return response(
            {
              error:
                "Gagal mengambil data player.",

              cocStatus:
                result.status,

              details:
                result.data
            },
            result.status,
            origin
          );

        }

        return response(
          result.data,
          200,
          origin
        );

      } catch (error) {

        return response(
          {
            error:
              "Gagal menghubungi Clash of Clans API."
          },
          500,
          origin
        );

      }

    }


    // ==================================================
    // CLAN
    // /clan?tag=%232J0P2GR08
    // ==================================================

    if (path === "/clan") {

      const rawTag =
        url.searchParams.get("tag");

      if (!rawTag) {

        return response(
          {
            error:
              "Clan tag belum diberikan."
          },
          400,
          origin
        );

      }

      const tag =
        cleanTag(rawTag);

      if (!tag.startsWith("#")) {

        return response(
          {
            error:
              "Clan tag harus diawali #."
          },
          400,
          origin
        );

      }

      try {

        const result = await getCoC(
          `/clans/${encodeURIComponent(tag)}`,
          env.COC_API_TOKEN
        );

        if (!result.ok) {

          return response(
            {
              error:
                "Gagal mengambil data clan.",

              cocStatus:
                result.status,

              details:
                result.data
            },
            result.status,
            origin
          );

        }

        return response(
          result.data,
          200,
          origin
        );

      } catch (error) {

        return response(
          {
            error:
              "Gagal menghubungi Clash of Clans API."
          },
          500,
          origin
        );

      }

    }


    // ==================================================
    // CWL BREAKDOWN
    //
    // /cwl?tag=%232J0P2GR08
    // ==================================================

    if (path === "/cwl") {

      const rawTag =
        url.searchParams.get("tag");

      if (!rawTag) {

        return response(
          {
            error:
              "Clan tag belum diberikan."
          },
          400,
          origin
        );

      }

      const clanTag =
        cleanTag(rawTag);

      if (!clanTag.startsWith("#")) {

        return response(
          {
            error:
              "Clan tag harus diawali #."
          },
          400,
          origin
        );

      }


      try {

        // ==============================================
        // GET CURRENT CWL LEAGUE GROUP
        // ==============================================

        const leagueResult =
          await getCoC(
            `/clans/${encodeURIComponent(
              clanTag
            )}/currentwar/leaguegroup`,
            env.COC_API_TOKEN
          );


        if (!leagueResult.ok) {

          return response(
            {
              error:
                "Data CWL tidak tersedia.",

              cocStatus:
                leagueResult.status,

              details:
                leagueResult.data,

              hint:
                "Pastikan clan sedang mengikuti CWL atau League Group masih tersedia."
            },
            leagueResult.status,
            origin
          );

        }


        const league =
          leagueResult.data;


        // ==============================================
        // BASIC LEAGUE DATA
        // ==============================================

        const participatingClans =
          Array.isArray(league.clans)
            ? league.clans
            : [];

        const rounds =
          Array.isArray(league.rounds)
            ? league.rounds
            : [];


        // ==============================================
        // FETCH ALL WAR TAGS
        // ==============================================

        const warRequests = [];

        rounds.forEach(
          (round, index) => {

            const warTags =
              Array.isArray(round.warTags)
                ? round.warTags
                : [];

            warTags.forEach(
              warTag => {

                if (
                  !warTag ||
                  warTag === "#0"
                ) {
                  return;
                }

                warRequests.push(
                  {
                    round:
                      index + 1,

                    warTag
                  }
                );

              }
            );

          }
        );


        // ==============================================
        // REMOVE DUPLICATE WAR TAGS
        // ==============================================

        const uniqueWars =
          warRequests.filter(
            (item, index, array) =>
              index ===
              array.findIndex(
                x =>
                  x.warTag ===
                  item.warTag
              )
          );


        // ==============================================
        // FETCH WARS
        // ==============================================

        const warResults =
          await Promise.all(
            uniqueWars.map(
              async item => {

                try {

                  const result =
                    await getCoC(
                      `/clanwarleagues/wars/${encodeURIComponent(
                        item.warTag
                      )}`,
                      env.COC_API_TOKEN
                    );

                  return {
                    round:
                      item.round,

                    warTag:
                      item.warTag,

                    result
                  };

                } catch (error) {

                  return {
                    round:
                      item.round,

                    warTag:
                      item.warTag,

                    result: {
                      ok: false,
                      status: 500,
                      data: {
                        error:
                          "Gagal mengambil data war."
                      }
                    }
                  };

                }

              }
            )
          );


        // ==============================================
        // NORMALIZE WAR DATA
        // ==============================================

        const wars =
          warResults.map(
            item => {

              if (!item.result.ok) {

                return {

                  round:
                    item.round,

                  warTag:
                    item.warTag,

                  state:
                    "unavailable",

                  available:
                    false,

                  error:
                    "Data war tidak tersedia.",

                  cocStatus:
                    item.result.status

                };

              }


              return normalizeWar(
                {
                  ...item.result.data,
                  tag:
                    item.warTag
                },
                clanTag,
                item.round
              );

            }
          );


        // ==============================================
        // CLAN TH BREAKDOWN
        // ==============================================

        const clanTHBreakdown =
          participatingClans.map(
            clan => {

              const memberList =
                Array.isArray(clan.memberList)
                  ? clan.memberList
                  : [];

              const th = {};

              memberList.forEach(
                member => {

                  const level =
                    Number(
                      member.townHallLevel || 0
                    );

                  if (!level) {
                    return;
                  }

                  const key =
                    `TH${level}`;

                  th[key] =
                    (th[key] || 0) + 1;

                }
              );


              return {

                tag:
                  clan.tag || "",

                name:
                  clan.name || "",

                clanLevel:
                  clan.clanLevel || 0,

                badgeUrls:
                  clan.badgeUrls || {},

                memberCount:
                  memberList.length,

                townHallBreakdown:
                  th

              };

            }
          );


        // ==============================================
        // RETURN
        // ==============================================

        return response(
          {

            success:
              true,

            clanTag,

            season:
              league.season || null,

            state:
              league.state || null,

            clans:
              clanTHBreakdown,

            rounds:
              rounds.map(
                (round, index) => ({

                  round:
                    index + 1,

                  warTags:
                    Array.isArray(
                      round.warTags
                    )
                      ? round.warTags
                      : []

                })
              ),

            wars

          },
          200,
          origin
        );


      } catch (error) {

        return response(
          {
            error:
              "Gagal mengambil data CWL.",

            message:
              error?.message || null
          },
          500,
          origin
        );

      }

    }


    // ==================================================
    // ENDPOINT TIDAK DITEMUKAN
    // ==================================================

    return response(
      {
        error:
          "Endpoint tidak ditemukan.",

        endpoints: [
          "/",
          "/player?tag=%239UG9LJV8Y",
          "/clan?tag=%232J0P2GR08",
          "/cwl?tag=%232J0P2GR08"
        ]
      },
      404,
      origin
    );

  }

};
