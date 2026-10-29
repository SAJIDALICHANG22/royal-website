/* Royal Water Tank Cleaning Services - site scripts */
var WA_NUMBER = "923013516594"; // international format, no + or spaces

(function () {
  // mobile menu
  var burger = document.querySelector(".burger");
  var menu = document.querySelector("nav.menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // scroll reveal
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("in"); });
  }

  // video sound toggle (video autoplays muted, loops)
  var vid = document.getElementById("introVideo");
  var sbtn = document.getElementById("soundBtn");
  if (vid && sbtn) {
    sbtn.addEventListener("click", function () {
      vid.muted = !vid.muted;
      if (!vid.muted) { vid.play(); }
      sbtn.querySelector("span").textContent = vid.muted ? "Sound on" : "Sound off";
    });
  }

  // quote form -> WhatsApp message
  var form = document.getElementById("quoteForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var lines = [
        "Assalam o Alaikum, I would like a tank cleaning quote.",
        "",
        "Name: " + (f.get("name") || ""),
        "Mobile/WhatsApp: " + (f.get("phone") || ""),
        "Area in Karachi: " + (f.get("area") || ""),
        "Tank type: " + (f.get("type") || ""),
        "Approx. tank size: " + (f.get("size") || "Not sure"),
        "Preferred date: " + (f.get("date") || "Flexible"),
        "Details: " + (f.get("details") || "-"),
        "",
        "I will send my location pin and tank photos here."
      ];
      var url = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  }

  // gallery + lightbox (reads gallery.json)
  var gal = document.getElementById("gallery");
  if (gal) {
    var base = gal.getAttribute("data-base") || "";
    fetch(base + "gallery.json")
      .then(function (r) { return r.json(); })
      .then(function (items) {
        items.forEach(function (it) {
          var b = document.createElement("button");
          b.type = "button";
          b.innerHTML = '<img loading="lazy" alt="' + (it.caption || "Royal Water Tank Cleaning") + '" src="' + base + it.src + '"><span class="cap">' + (it.caption || "") + "</span>";
          b.addEventListener("click", function () { openLb(base + it.src, it.caption); });
          gal.appendChild(b);
        });
      })
      .catch(function () { gal.innerHTML = "<p>Photos will appear here.</p>"; });
  }
  var lb = document.getElementById("lightbox");
  function openLb(src, alt) {
    if (!lb) return;
    lb.querySelector("img").src = src;
    lb.querySelector("img").alt = alt || "";
    lb.classList.add("open");
  }
  if (lb) {
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.tagName === "BUTTON") lb.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") lb.classList.remove("open"); });
  }
})();
