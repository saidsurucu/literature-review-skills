(function () {
  function looksLikeChallenge(html) {
    return /Just a moment|cf-challenge|Attention Required|captcha/i.test(html || "");
  }
  window.__LR_references = async function (url, parseFn) {
    try {
      const html = await (await fetch(url, { credentials: "include" })).text();
      if (looksLikeChallenge(html)) return { error: "challenge", url };
      return { url, references: parseFn(html) };
    } catch (e) { return { error: String(e && e.message || e), url }; }
  };
})();
