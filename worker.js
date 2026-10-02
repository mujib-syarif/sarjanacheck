const COC_API = "https://cocproxy.royaleapi.dev/v1";

const ALLOWED_ORIGIN =
  "https://mujib-syarif.github.io";


/* =========================
   CORS
========================= */

function corsHeaders(request) {

  const origin =
    request.headers.get("Origin") || "";

  return {
    "Access-Control-Allow-Origin":
      origin === ALLOWED_ORIGIN
        ? origin
        : ALLOWED_ORIGIN,

    "Access-Control-Allow-Methods":
      "GET, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age":
      "86400",

    "Content-Type":
      "application/json; charset=utf-8"
  };
}


/* =========================
   RESPONSE
========================= */

function json(data, status, request) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders(request)
    }
  );
}


/* =========================
   TAG
========================= */

function cleanTag(value) {

  let tag =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    tag &&
    !tag.startsWith("#")
  ) {
    tag = "#" + tag;
  }

  return tag;
}


/* =========================
   API REQUEST
========================= */

async function getCoC(path, env) {

  const token =
    env.COC_API_TOKEN;

  if (!token) {
    throw new Error(
      "COC_API_TOKEN belum tersedia."
    );
  }

  const response =
    await fetch(
      `${COC_API}${path}`,
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${token}`,

          "Accept":
            "application/json"
        }
      }
    );

  let data;

  try {

    data =
      await response.json();

  } catch {

    data = {
      reason:
        "invalid_response",

      message:
        "API memberikan response yang tidak valid."
    };
  }

  if (!response.ok) {

    const error =
      new Error(
        data?.message ||
        data?.reason ||
        `HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}


/* =========================
   SAFE NUMBER
========================= */

function number(value) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}


/* =========================
   TH BREAKDOWN
========================= */

function buildTHBreakdown(memberList) {

  const breakdown = {};

  for (
    const member
    of memberList || []
  ) {

    const th =
      number(
        member.townHallLevel
      );

    if (!th) continue;

    breakdown[th] =
      (breakdown[th] || 0) + 1;
  }

  return breakdown;
}


/* =========================
   MERGE MEMBER LIST
========================= */

function mergeMembers(
  target,
  source
) {

  for (
    const member
    of source || []
  ) {

    if (!member?.tag) {
      continue;
    }

    target.set(
      member.tag,
      member
    );
  }
}


/* =========================
   NORMALIZE WAR CLAN
========================= */

function normalizeWarClan(clan) {

  if (!clan) {
    return null;
  }

  const memberList =
    clan.memberList || [];

  return {

    tag:
      clan.tag || "",

    name:
      clan.name || "",

    clanLevel:
      clan.clanLevel ?? null,

    badgeUrls:
      clan.badgeUrls || {},

    stars:
      number(clan.stars),

    destructionPercentage:
      number(
        clan.destructionPercentage
      ),

    attacks:
      number(clan.attacks),

    memberList,

    memberCount:
      memberList.length,

    townHallBreakdown:
      buildTHBreakdown(
        memberList
      )
  };
}


/* =========================
   NORMALIZE WAR
========================= */

function normalizeWar(war) {

  if (!war) {
    return null;
  }

  return {

    tag:
      war.tag || "",

    state:
      war.state || "",

    teamSize:
      number(war.teamSize),

    startTime:
      war.startTime || null,

    endTime:
      war.endTime || null,

    clan:
      normalizeWarClan(
        war.clan
      ),

    opponent:
      normalizeWarClan(
        war.opponent
      )
  };
}


/* =========================
   GET ALL WAR TAGS
========================= */

function getWarTags(rounds) {

  const tags = [];

  for (
    const round
    of rounds || []
  ) {

    for (
      const warTag
      of round.warTags || []
    ) {

      if (
        warTag &&
        warTag !== "#0"
      ) {

        tags.push(warTag);
      }
    }
  }

  return [
    ...new Set(tags)
  ];
}


/* =========================
   CWL
========================= */

async function getCWL(
  clanTag,
  env
) {

  /*
    First:
    ambil CWL league group
  */

  const group =
    await getCoC(
      `/clans/${encodeURIComponent(clanTag)}/currentwar/leaguegroup`,
      env
    );


  /*
    Ambil detail clan sekarang
    supaya description,
    logo, warLeague, dll tersedia.
  */

  let currentClan = null;

  try {

    currentClan =
      await getCoC(
        `/clans/${encodeURIComponent(clanTag)}`,
        env
      );

  } catch {

    currentClan = null;
  }


  /*
    Daftar clan peserta CWL
  */

  const groupClans =
    group.clans || [];


  /*
    Semua warTag dari semua round
  */

  const warTags =
    getWarTags(
      group.rounds
    );


  /*
    Ambil seluruh war CWL.
    Kita butuh memberList
    dari setiap war untuk
    menghitung TH breakdown.
  */

  const warResults =
    await Promise.all(
      warTags.map(
        async warTag => {

          try {

            return await getCoC(
              `/clanwarleagues/wars/${encodeURIComponent(warTag)}`,
              env
            );

          } catch {

            return null;
          }
        }
      )
    );


  const wars =
    warResults
      .filter(Boolean);


  /*
    Map roster berdasarkan
    clan tag.
  */

  const rosterMap =
    new Map();


  /*
    Seed semua clan dari
    leaguegroup.
  */

  for (
    const clan
    of groupClans
  ) {

    if (!clan?.tag) {
      continue;
    }

    rosterMap.set(
      clan.tag,
      {
        tag:
          clan.tag,

        name:
          clan.name || "",

        clanLevel:
          clan.clanLevel ?? null,

        badgeUrls:
          clan.badgeUrls || {},

        members:
          number(clan.members),

        memberList:
          new Map()
      }
    );
  }


  /*
    Masukkan member dari
    setiap war ke clan yang
    sesuai.
  */

  for (
    const war
    of wars
  ) {

    const sides = [
      war?.clan,
      war?.opponent
    ];

    for (
      const side
      of sides
    ) {

      if (!side?.tag) {
        continue;
      }

      if (
        !rosterMap.has(
          side.tag
        )
      ) {

        rosterMap.set(
          side.tag,
          {
            tag:
              side.tag,

            name:
              side.name || "",

            clanLevel:
              side.clanLevel ?? null,

            badgeUrls:
              side.badgeUrls || {},

            members:0,

            memberList:
              new Map()
          }
        );
      }

      const entry =
        rosterMap.get(
          side.tag
        );

      mergeMembers(
        entry.memberList,
        side.memberList
      );

      /*
        Kalau data dasar
        dari war lebih lengkap,
        update metadata.
      */

      if (side.name) {
        entry.name =
          side.name;
      }

      if (
        side.clanLevel != null
      ) {
        entry.clanLevel =
          side.clanLevel;
      }

      if (
        side.badgeUrls
      ) {
        entry.badgeUrls =
          side.badgeUrls;
      }
    }
  }


  /*
    Bentuk final daftar clan.
  */

  const clans =
    [...rosterMap.values()]
      .map(entry => {

        const memberList =
          [...entry.memberList.values()];

        return {

          tag:
            entry.tag,

          name:
            entry.name,

          clanLevel:
            entry.clanLevel,

          badgeUrls:
            entry.badgeUrls,

          memberCount:
            memberList.length ||
            entry.members ||
            0,

          members:
            entry.members ||
            memberList.length ||
            0,

          memberList,

          townHallBreakdown:
            buildTHBreakdown(
              memberList
            )
        };
      });


  /*
    Pastikan clan utama
    tetap mudah ditemukan.
  */

  clans.sort(
    (a,b) => {

      if (
        a.tag === clanTag
      ) return -1;

      if (
        b.tag === clanTag
      ) return 1;

      return String(a.name)
        .localeCompare(
          String(b.name)
        );
    }
  );


  /*
    Normalisasi rounds.
  */

  const rounds =
    (group.rounds || [])
      .map(
        (round,index) => ({

          round:
            index + 1,

          warTags:
            round.warTags || []
        })
      );


  /*
    Normalisasi wars.
  */

  const normalizedWars =
    wars.map(
      normalizeWar
    );


  return {

    tag:
      clanTag,

    state:
      group.state || "",

    season:
      group.season || "",

    currentClan:
      currentClan
        ? {
            tag:
              currentClan.tag,

            name:
              currentClan.name,

            description:
              currentClan.description || "",

            clanLevel:
              currentClan.clanLevel,

            members:
              currentClan.members,

            type:
              currentClan.type,

            badgeUrls:
              currentClan.badgeUrls || {},

            warLeague:
              currentClan.warLeague || null
          }
        : null,

    clans,

    rounds,

    wars:
      normalizedWars
  };
}


/* =========================
   PLAYER NORMALIZATION
========================= */

function normalizePlayer(
  player
) {

  /*
    Jangan menghapus
    heroEquipment.
    Ini adalah daftar
    equipment yang unlocked.
  */

  return {

    ...player,

    heroes:
      player.heroes || [],

    heroEquipment:
      player.heroEquipment || []
  };
}


/* =========================
   MAIN
========================= */

export default {

  async fetch(
    request,
    env
  ) {

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status:204,
          headers:
            corsHeaders(request)
        }
      );
    }


    if (
      request.method !== "GET"
    ) {

      return json(
        {
          error:
            "Method tidak diizinkan."
        },
        405,
        request
      );
    }


    const url =
      new URL(
        request.url
      );

    const pathname =
      url.pathname
        .replace(
          /^\/+/,
          ""
        );


    const tag =
      cleanTag(
        url.searchParams.get(
          "tag"
        )
      );


    if (
      !tag ||
      tag === "#"
    ) {

      return json(
        {
          error:
            "Parameter tag wajib diisi."
        },
        400,
        request
      );
    }


    try {

      /* PLAYER */

      if (
        pathname === "player"
      ) {

        const player =
          await getCoC(
            `/players/${encodeURIComponent(tag)}`,
            env
          );

        return json(
          normalizePlayer(player),
          200,
          request
        );
      }


      /* CLAN */

      if (
        pathname === "clan"
      ) {

        const clan =
          await getCoC(
            `/clans/${encodeURIComponent(tag)}`,
            env
          );

        return json(
          clan,
          200,
          request
        );
      }


      /* CWL */

      if (
        pathname === "cwl"
      ) {

        const cwl =
          await getCWL(
            tag,
            env
          );

        return json(
          cwl,
          200,
          request
        );
      }


      return json(
        {
          error:
            "Endpoint tidak ditemukan.",

          available:
            [
              "/player?tag=",
              "/clan?tag=",
              "/cwl?tag="
            ]
        },
        404,
        request
      );

    } catch(error) {

      return json(
        {
          error:
            "Gagal mengambil data Clash of Clans.",

          message:
            error.message,

          status:
            error.status || 500,

          details:
            error.data || null
        },
        error.status || 500,
        request
      );
    }
  }
};
