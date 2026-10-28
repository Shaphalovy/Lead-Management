(function () {
  "use strict";

  var CFG = window.APP_CONFIG || {};
  var pageLoadedAt = Date.now();

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- footer year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- mobile nav ---------- */
  var toggle = $("#navToggle");
  var links = $("#navLinks");
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- form ---------- */
  var form = $("#leadForm");
  var submitBtn = $("#submitBtn");
  var statusEl = $("#formStatus");
  var successBox = $("#successBox");
  var msgCount = $("#msgCount");
  var submitting = false;

  var rules = {
    name: function (v) {
      if (v.length < 2) return "Please enter your full name.";
      return "";
    },
    email: function (v) {
      if (!v) return "Please enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That email does not look right.";
      return "";
    },
    company: function (v) {
      if (v.length < 2) return "Please enter your company name.";
      return "";
    },
    service: function (v) {
      if (!v) return "Please choose a service.";
      return "";
    },
    message: function (v) {
      if (v.length < 10) return "Please write at least 10 characters.";
      return "";
    }
  };

  function validateField(name) {
    var input = form.elements[name];
    var value = (input.value || "").trim();
    var msg = rules[name](value);
    var wrap = input.closest(".field");
    var err = $('.error[data-for="' + name + '"]');
    err.textContent = msg;
    wrap.classList.toggle("invalid", !!msg);
    wrap.classList.toggle("valid", !msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    var evt = input.tagName === "SELECT" ? "change" : "blur";
    input.addEventListener(evt, function () { validateField(name); });
    input.addEventListener("input", function () {
      if (input.closest(".field").classList.contains("invalid")) validateField(name);
    });
  });

  form.elements.message.addEventListener("input", function (e) {
    msgCount.textContent = e.target.value.length + " / 1000";
  });

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.classList.toggle("err", !!isError);
  }

  function setLoading(on) {
    submitting = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.querySelector(".btn__label").textContent = on ? "Sending..." : "Send my enquiry";
  }

  function cooldownLeft() {
    try {
      var last = parseInt(localStorage.getItem("lead_last_submit") || "0", 10);
      var left = Math.ceil((last + (CFG.COOLDOWN_SECONDS || 30) * 1000 - Date.now()) / 1000);
      return left > 0 ? left : 0;
    } catch (e) { return 0; }
  }

  function showSuccess(name, email) {
    $("#successName").textContent = name.split(" ")[0];
    $("#successEmail").textContent = email;
    form.hidden = true;
    successBox.hidden = false;
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function postLead(payload) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, CFG.TIMEOUT_MS || 15000);
    return fetch(CFG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error("Server responded with " + res.status);
      return res;
    }).catch(function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return; // double-submit guard
    setStatus("");

    // validate everything, focus first problem
    var firstBad = null;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(name) && !firstBad) firstBad = form.elements[name];
    });
    if (firstBad) { firstBad.focus(); return; }

    var data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      company: form.elements.company.value.trim(),
      service: form.elements.service.value,
      message: form.elements.message.value.trim()
    };

    // spam checks: honeypot filled, or submitted too fast -> pretend success, send nothing
    var tooFast = (Date.now() - pageLoadedAt) < (CFG.MIN_SECONDS_ON_PAGE || 3) * 1000;
    if (form.elements.website.value || tooFast) {
      showSuccess(data.name, data.email);
      return;
    }

    var wait = cooldownLeft();
    if (wait) {
      setStatus("Please wait " + wait + "s before sending another enquiry.", true);
      return;
    }

    var payload = {
      name: data.name,
      email: data.email,
      company: data.company,
      service: data.service,
      message: data.message,
      source: "website-contact-form",
      page_url: location.href,
      submitted_at: new Date().toISOString()
    };

    setLoading(true);

    // DEMO mode: no webhook configured yet
    if (!CFG.WEBHOOK_URL) {
      console.info("[DEMO MODE] Would send to webhook:", payload);
      setTimeout(function () {
        setLoading(false);
        showSuccess(data.name, data.email);
      }, 900);
      return;
    }

    postLead(payload).then(function () {
      try { localStorage.setItem("lead_last_submit", String(Date.now())); } catch (e) {}
      setLoading(false);
      showSuccess(data.name, data.email);
    }).catch(function (err) {
      console.error("Lead submit failed:", err);
      setLoading(false);
      setStatus(err.name === "AbortError"
        ? "The request timed out. Please try again."
        : "Something went wrong sending your enquiry. Please try again.", true);
    });
  });

  $("#againBtn").addEventListener("click", function () {
    form.reset();
    msgCount.textContent = "0 / 1000";
    $$(".field").forEach(function (f) { f.classList.remove("valid", "invalid"); });
    $$(".error").forEach(function (er) { er.textContent = ""; });
    setStatus("");
    successBox.hidden = true;
    form.hidden = false;
    pageLoadedAt = Date.now();
  });
})();
