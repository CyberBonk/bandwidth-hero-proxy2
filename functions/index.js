const pick = require("../util/pick"),
  fetch = require("node-fetch"),
  shouldCompress = require("../util/shouldCompress"),
  compress = require("../util/compress"),
  DEFAULT_QUALITY = 40;
exports.handler = async (e, t) => {
  let { url: r } = e.queryStringParameters,
    { jpeg: s, bw: o, l: a } = e.queryStringParameters;
  if (!r)
    return { statusCode: 200, body: "bandwidth-hero-proxy" };
  try {
    r = JSON.parse(r);
  } catch {}
  Array.isArray(r) && (r = r.join("&url=")),
    (r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://"));
  let d = !s,
    n = 0 != o,
    i = parseInt(a, 10) || 40;
  try {
    const requestHeaders = {
      ...pick(e.headers, ["cookie", "dnt", "referer", "user-agent", "accept", "accept-language", "accept-encoding"]),
      "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
    };
    if (/^https:\/\/[^/]+\.cipher-vault-alpha\.site\//i.test(r) && !requestHeaders.referer) {
      requestHeaders.referer = "https://comix.to/";
    }
    const comixOrigin = /^https:\/\/(?:[^/]+\.)?comix\.(?:to|ws)$/i.test(e.headers.origin || "");
    const rawComix = /^https:\/\/[^/]+\.cipher-vault-alpha\.site\//i.test(r) &&
      (new URL(r).searchParams.has("v3") || comixOrigin);
    if (rawComix && comixOrigin) requestHeaders.origin = e.headers.origin;
    let h = {},
      { data: c, type: l } = await fetch(r, {
        headers: requestHeaders,
      }).then(async (e) =>
        e.ok
          ? ((h = e.headers),
            {
              data: await e.buffer(),
              type: e.headers.get("content-type") || "",
            })
          : { statusCode: e.status || 502 },
      ),
      p = c?.length;
    if (!p) return { statusCode: 302, headers: { location: r }, body: "" };
    if (rawComix) {
      const rawHeaders = { "content-type": l, "content-encoding": "identity" };
      for (const name of ["x-enc-seed", "x-enc-len", "x-enc-algo", "x-scramble-seed", "x-scramble-grid", "x-scramble-algo", "x-scramble-hash"]) {
        const value = h.get(name);
        if (value) rawHeaders[name] = value;
      }
      return { statusCode: 200, body: c.toString("base64"), isBase64Encoded: true, headers: rawHeaders };
    }
    if (!shouldCompress(l, p, d))
      return (
        console.log("Bypassing... Size: ", c.length),
        {
          statusCode: 200,
          body: c.toString("base64"),
          isBase64Encoded: !0,
          headers: { "content-encoding": "identity", ...h },
        }
      );
    {
      let { err: u, output: y, headers: g } = await compress(c, d, n, i, p);
      if (u) throw (console.log("Conversion failed: ", r), u);
      console.log(`From ${p}, Saved: ${(p - y.length) / p}%`);
      let $ = y.toString("base64");
      return {
        statusCode: 200,
        body: $,
        isBase64Encoded: !0,
        headers: { "content-encoding": "identity", ...h, ...g },
      };
    }
  } catch (f) {
    return console.error(f), { statusCode: 500, body: f.message || "" };
  }
};
