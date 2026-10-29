/* Blog: reads posts.json and blog/posts/<slug>.md  */
(function () {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmtDate(d) {
    var dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  // very small markdown renderer: #, ##, ###, lists, > quote, images, links, bold, italic
  function inline(t) {
    t = esc(t);
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img loading="lazy" alt="$1" src="$2">');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
    return t;
  }
  function md(src) {
    var lines = src.replace(/\r/g, "").split("\n"), out = [], list = null, para = [];
    function flushP() { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } }
    function flushL() { if (list) { out.push("</" + list + ">"); list = null; } }
    lines.forEach(function (ln) {
      var m;
      if (/^\s*$/.test(ln)) { flushP(); flushL(); return; }
      if ((m = ln.match(/^(#{1,3})\s+(.*)/))) { flushP(); flushL(); var n = m[1].length + 1; if (n > 4) n = 4; out.push("<h" + n + ">" + inline(m[2]) + "</h" + n + ">"); return; }
      if ((m = ln.match(/^>\s?(.*)/))) { flushP(); flushL(); out.push("<blockquote>" + inline(m[1]) + "</blockquote>"); return; }
      if ((m = ln.match(/^\s*[-*]\s+(.*)/))) { flushP(); if (list !== "ul") { flushL(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); return; }
      if ((m = ln.match(/^\s*\d+\.\s+(.*)/))) { flushP(); if (list !== "ol") { flushL(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); return; }
      if (/^!\[.*\]\(.*\)\s*$/.test(ln)) { flushP(); flushL(); out.push(inline(ln)); return; }
      flushL(); para.push(ln.trim());
    });
    flushP(); flushL();
    return out.join("\n");
  }

  function loadPosts() {
    return fetch("posts.json?v=" + Date.now()).then(function (r) { return r.json(); }).then(function (list) {
      list.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      return list;
    });
  }

  // ---- blog list page
  var listEl = document.getElementById("postList");
  if (listEl) {
    var limit = parseInt(listEl.getAttribute("data-limit") || "0", 10);
    loadPosts().then(function (posts) {
      if (limit) posts = posts.slice(0, limit);
      if (!posts.length) { listEl.innerHTML = "<p>No posts yet. Please check back soon.</p>"; return; }
      listEl.innerHTML = posts.map(function (p) {
        return '<a class="post-card reveal in" href="post.html?p=' + encodeURIComponent(p.slug) + '">' +
          '<img loading="lazy" alt="' + esc(p.title) + '" src="' + esc(p.image) + '">' +
          '<div class="body"><span class="meta">' + esc(fmtDate(p.date)) + "</span>" +
          "<h3>" + esc(p.title) + "</h3><p>" + esc(p.excerpt) + '</p><span class="more">Read article &rarr;</span></div></a>';
      }).join("");
    }).catch(function () { listEl.innerHTML = "<p>Could not load posts.</p>"; });
  }

  // ---- single post page
  var postEl = document.getElementById("postBody");
  if (postEl) {
    var slug = new URLSearchParams(location.search).get("p");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) { postEl.innerHTML = "<p>Post not found. <a href='blog.html'>Back to blog</a></p>"; return; }
    loadPosts().then(function (posts) {
      var meta = posts.filter(function (p) { return p.slug === slug; })[0];
      if (!meta) throw new Error("nf");
      return fetch("post-" + slug + ".md?v=" + Date.now()).then(function (r) {
        if (!r.ok) throw new Error("nf"); return r.text();
      }).then(function (text) {
        document.title = meta.title + " | Royal Water Tank Cleaning Services";
        var h = document.getElementById("postTitle"); if (h) h.textContent = meta.title;
        var d = document.getElementById("postMeta"); if (d) d.textContent = fmtDate(meta.date) + " · Royal Water Tank Cleaning Services";
        var md_ = document.querySelector('meta[name="description"]'); if (md_) md_.setAttribute("content", meta.excerpt);
        postEl.innerHTML = '<img class="post-cover" alt="' + esc(meta.title) + '" src="' + esc(meta.image) + '">' + md(text);
      });
    }).catch(function () { postEl.innerHTML = "<p>Post not found. <a href='blog.html'>Back to blog</a></p>"; });
  }
})();
