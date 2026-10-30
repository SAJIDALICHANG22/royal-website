/* Royal blog admin: publishes posts straight to GitHub using a personal access token kept only in this browser. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // guess owner/repo from the github.io address
  var host = location.hostname, guessOwner = "", guessRepo = "";
  if (/\.github\.io$/.test(host)) {
    guessOwner = host.split(".")[0];
    guessRepo = location.pathname.split("/")[1] || "";
  }
  $("owner").value = LS.get("rw_owner") || guessOwner;
  $("repo").value = LS.get("rw_repo") || guessRepo;
  $("token").value = LS.get("rw_token");
  if (!LS.get("rw_token")) $("settings").open = true;
  $("date").value = new Date().toISOString().slice(0, 10);

  function status(msg, kind) {
    var s = $("status");
    s.textContent = msg;
    s.className = "status " + (kind || "");
    s.style.display = msg ? "block" : "none";
  }

  function b64FromText(text) {
    var bytes = new TextEncoder().encode(text), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function textFromB64(b64) {
    var bin = atob(b64.replace(/\n/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function fileToB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1]); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function api(path, opts) {
    var o = LS.get("rw_owner"), r = LS.get("rw_repo"), t = LS.get("rw_token");
    opts = opts || {};
    opts.headers = {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + t,
      "Content-Type": "application/json"
    };
    return fetch("https://api.github.com/repos/" + o + "/" + r + "/contents/" + path, opts).then(function (res) {
      if (res.status === 404 && (!opts.method || opts.method === "GET")) return null;
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          var m = j.message || ("HTTP " + res.status);
          if (res.status === 401) m = "Token galat ya expire ho gaya hai.";
          if (res.status === 403) m = "Token ko is repository par 'Contents: Read and write' ki ijazat chahiye.";
          throw new Error(m);
        });
      }
      return res.json();
    });
  }
  function putFile(path, contentB64, message, sha) {
    var body = { message: message, content: contentB64 };
    if (sha) body.sha = sha;
    return api(encodeURI(path), { method: "PUT", body: JSON.stringify(body) });
  }

  function slugify(t) {
    var s = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    return s;
  }

  $("saveSettings").addEventListener("click", function () {
    LS.set("rw_owner", $("owner").value.trim());
    LS.set("rw_repo", $("repo").value.trim());
    LS.set("rw_token", $("token").value.trim());
    status("Settings is browser me save ho gayi.", "ok");
  });
  $("forget").addEventListener("click", function () {
    LS.del("rw_token"); $("token").value = "";
    status("Token is browser se hata diya gaya.", "ok");
  });

  // markdown toolbar
  var body = $("body");
  function wrap(before, after, placeholder) {
    var s = body.selectionStart, e = body.selectionEnd, sel = body.value.slice(s, e) || placeholder;
    body.value = body.value.slice(0, s) + before + sel + after + body.value.slice(e);
    body.focus();
    body.selectionStart = s + before.length; body.selectionEnd = s + before.length + sel.length;
  }
  function linePrefix(prefix) {
    var s = body.selectionStart, start = body.value.lastIndexOf("\n", s - 1) + 1;
    body.value = body.value.slice(0, start) + prefix + body.value.slice(start);
    body.focus();
  }
  document.querySelectorAll("[data-md]").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-md");
      if (k === "h2") linePrefix("## ");
      if (k === "bold") wrap("**", "**", "bold text");
      if (k === "list") linePrefix("- ");
      if (k === "quote") linePrefix("> ");
      if (k === "link") wrap("[", "](https://wa.me/923013516594)", "link text");
    });
  });

  $("cover").addEventListener("change", function () {
    $("coverUpload").style.display = $("cover").value === "__upload" ? "block" : "none";
  });

  $("publish").addEventListener("click", function () {
    var o = LS.get("rw_owner"), r = LS.get("rw_repo"), t = LS.get("rw_token");
    if (!o || !r || !t) { status("Pehle upar Settings bhar kar 'Save settings' dabayen.", "err"); return; }
    var title = $("title").value.trim(), excerpt = $("excerpt").value.trim(), text = body.value.trim(), date = $("date").value;
    if (!title || !excerpt || !text) { status("Title, short summary aur post ka text zaroori hain.", "err"); return; }
    var btn = $("publish"); btn.disabled = true;
    var slug = slugify(title) || ("post-" + date.replace(/-/g, "") + "-" + Date.now().toString().slice(-4));
    var cover = $("cover").value, coverFile = $("coverFile").files[0];
    var imgName = cover;

    status("Publish ho raha hai...", "");
    var chain = Promise.resolve();

    if (cover === "__upload") {
      if (!coverFile) { status("Cover photo chunen.", "err"); btn.disabled = false; return; }
      imgName = coverFile.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      chain = chain.then(function () { return fileToB64(coverFile); }).then(function (b) {
        return api(encodeURI(imgName)).then(function (ex) {
          return putFile(imgName, b, "Add blog image " + imgName, ex && ex.sha);
        });
      });
    }

    chain.then(function () {
      return api("posts.json");
    }).then(function (pj) {
      var list = pj ? JSON.parse(textFromB64(pj.content)) : [];
      if (list.some(function (p) { return p.slug === slug; })) slug = slug + "-" + date.replace(/-/g, "");
      var mdPath = "post-" + slug + ".md";
      return api(mdPath).then(function (ex) {
        if (ex) throw new Error("Is naam ki post pehle se maujood hai. Title thora badal den.");
        return putFile(mdPath, b64FromText(text + "\n"), "Add blog post: " + title);
      }).then(function () {
        list.unshift({ slug: slug, title: title, date: date, excerpt: excerpt, image: imgName });
        return putFile("posts.json", b64FromText(JSON.stringify(list, null, 2) + "\n"), "Update posts list: " + title, pj && pj.sha);
      }).then(function () {
        // keep sitemap.xml in step so Google can find the new post
        return api("sitemap.xml").then(function (sm) {
          if (!sm) return;
          var xml = textFromB64(sm.content);
          var base = (xml.match(/<loc>(https?:\/\/[^<]*?\/)<\/loc>/) || [])[1];
          if (!base) return;
          var entry = "  <url><loc>" + base + "post.html?p=" + encodeURIComponent(slug) + "</loc><lastmod>" + date + "</lastmod><priority>0.6</priority></url>\n";
          if (xml.indexOf(entry.trim()) !== -1) return;
          xml = xml.replace("</urlset>", entry + "</urlset>");
          return putFile("sitemap.xml", b64FromText(xml), "Update sitemap: " + title, sm.sha);
        }).catch(function () { /* sitemap update is optional */ });
      });
    }).then(function () {
      status("Post publish ho gayi! Website par 1 se 2 minute me nazar aaye gi.", "ok");
      $("viewLink").href = "post.html?p=" + encodeURIComponent(slug);
      $("viewLink").style.display = "inline-flex";
      $("title").value = ""; $("excerpt").value = ""; body.value = "";
    }).catch(function (e) {
      status("Masla: " + e.message, "err");
    }).then(function () { btn.disabled = false; });
  });
})();
