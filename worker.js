// Sarjana Checker API
const COC_API = "https://cocproxy.royaleapi.dev/v1";
const ALLOWED_ORIGIN = "https://mujibsyarif.github.io";

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

  const data = await res.json();

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}

export default {
  async fetch(request, env) {

    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: headers(origin)
      });
    }

    // Hanya GET
    if (request.method !== "GET") {
      return response(
        {
          error: "Method tidak diizinkan."
        },
        405,
        origin
      );
    }

    // Pastikan Secret tersedia
    if (!env.COC_API_TOKEN) {
      return response(
        {
          error: "COC_API_TOKEN belum terpasang di Worker."
        },
        500,
        origin
      );
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");


    // =========================
    // HOME / STATUS
    // =========================

    if (path === "") {
      return response(
        {
          status: "online",
          service: "Clash of Clans Tag Tracker API",
          by: "Mujib, S.Coc."
        },
        200,
        origin
      );
    }


    // =========================
    // PLAYER
    // /player?tag=%239UG9LJV8Y
    // =========================

    if (path === "/player") {

      const rawTag = url.searchParams.get("tag");

      if (!rawTag) {
        return response(
          {
            error: "Player tag belum diberikan."
          },
          400,
          origin
        );
      }

      const tag = cleanTag(rawTag);

      if (!tag.startsWith("#")) {
        return response(
          {
            error: "Player tag harus diawali #."
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
              error: "Gagal mengambil data player.",
              cocStatus: result.status,
              details: result.data
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
            error: "Gagal menghubungi Clash of Clans API."
          },
          500,
          origin
        );

      }
    }


    // =========================
    // CLAN
    // /clan?tag=%232J0P2GR08
    // =========================

    if (path === "/clan") {

      const rawTag = url.searchParams.get("tag");

      if (!rawTag) {
        return response(
          {
            error: "Clan tag belum diberikan."
          },
          400,
          origin
        );
      }

      const tag = cleanTag(rawTag);

      if (!tag.startsWith("#")) {
        return response(
          {
            error: "Clan tag harus diawali #."
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
              error: "Gagal mengambil data clan.",
              cocStatus: result.status,
              details: result.data
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
            error: "Gagal menghubungi Clash of Clans API."
          },
          500,
          origin
        );

      }
    }


    // =========================
    // ENDPOINT TIDAK DITEMUKAN
    // =========================

    return response(
      {
        error: "Endpoint tidak ditemukan.",
        endpoints: [
          "/",
          "/player?tag=%239UG9LJV8Y",
          "/clan?tag=%232J0P2GR08"
        ]
      },
      404,
      origin
    );
  }
};
