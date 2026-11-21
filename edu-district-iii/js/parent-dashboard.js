/* =========================================
   EDU. DISTRICT III - Parent dashboard
   All text is inserted with textContent (never innerHTML) so
   database content can never inject markup or scripts.
   ========================================= */
(function () {
  "use strict";

  var sb = window.sb;
  var $ = function (id) { return document.getElementById(id); };

  var TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  var MAX_BYTES = 2 * 1024 * 1024;
  var user = null;
  var previewUrl = null;

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function goLogin() { window.location.replace("login.html"); }

  function num(x) {
    var n = Number(x);
    if (!isFinite(n)) return "–";
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function fmtDate(d) {
    var dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  }

  /* ---------- SCHOOLS ---------- */
  async function loadSchools() {
    var select = $("reg-school");
    var res = await sb.from("schools").select("id, school_name").eq("is_active", true).order("school_name");
    select.textContent = "";

    if (res.error || !res.data || res.data.length === 0) {
      var none = node("option", null, "No schools are available for registration yet");
      none.value = "";
      select.appendChild(none);
      select.disabled = true;
      return;
    }
    var first = node("option", null, "Select school");
    first.value = "";
    select.appendChild(first);
    res.data.forEach(function (s) {
      var o = node("option", null, s.school_name);
      o.value = s.id;
      select.appendChild(o);
    });
  }

  /* ---------- CHILDREN ---------- */
  var STATUS = {
    pending:  { label: "Awaiting school verification", cls: "badge-pending" },
    verified: { label: "Verified",                     cls: "badge-ok" },
    rejected: { label: "Not approved",                 cls: "badge-bad" }
  };

  async function loadChildren() {
    var list = $("children-list");
    var res = await sb.from("v_my_children").select("*").order("requested_at", { ascending: false });
    list.textContent = "";

    if (res.error) {
      list.appendChild(node("p", "muted", "We could not load your children. Please refresh the page."));
      return;
    }
    if (!res.data || res.data.length === 0) {
      list.appendChild(node("p", "empty-state", "You have not registered a child yet. Use the form below to start."));
      return;
    }
    res.data.forEach(function (row) { list.appendChild(renderChild(row)); });
  }

  function renderChild(row) {
    var st = STATUS[row.verification_status] || STATUS.pending;
    var card = node("article", "child-card");

    var head = node("div", "child-head");
    var photo = node("img", "child-photo");
    photo.alt = "Passport photograph of " + row.full_name;
    head.appendChild(photo);
    loadPhoto(photo, row.passport_path);

    var info = node("div", "child-info");
    info.appendChild(node("h3", null, row.full_name));
    info.appendChild(node("p", "child-meta", row.school_name));
    info.appendChild(node("p", "child-meta", "Admission no. " + row.admission_number + " · " + row.class_name));
    info.appendChild(node("span", "badge " + st.cls, st.label));
    head.appendChild(info);
    card.appendChild(head);

    if (row.verification_status === "pending") {
      card.appendChild(node("p", "child-note",
        "The school is checking this request against its records. For questions, contact the school administrator."));
    } else if (row.verification_status === "rejected") {
      card.appendChild(node("p", "child-note",
        "The school could not verify this request. Please contact the school administrator."));
    } else {
      var btn = node("button", "button button-outline-dark button-small", "View results & attendance");
      btn.type = "button";
      btn.setAttribute("aria-expanded", "false");
      var panel = node("div", "child-panel");
      panel.hidden = true;
      var loaded = false;

      btn.addEventListener("click", async function () {
        var open = panel.hidden;
        panel.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "Hide details" : "View results & attendance";
        if (open && !loaded) { loaded = true; await loadDetails(row, panel); }
      });

      card.appendChild(btn);
      card.appendChild(panel);
    }
    return card;
  }

  async function loadPhoto(img, path) {
    if (!path) return;
    var res = await sb.storage.from("passports").createSignedUrl(path, 3600);
    if (!res.error && res.data) img.src = res.data.signedUrl;
  }

  /* ---------- CHILD DETAILS ---------- */
  async function loadDetails(row, panel) {
    panel.textContent = "";
    panel.appendChild(node("p", "muted", "Loading…"));

    var out = await Promise.all([
      sb.from("v_published_results").select("*").eq("student_id", row.student_id).order("term_start", { ascending: false }),
      sb.from("attendance").select("attendance_date, status").eq("student_id", row.student_id)
        .order("attendance_date", { ascending: false }).limit(14),
      sb.from("v_my_promotions").select("*").eq("student_id", row.student_id)
        .order("created_at", { ascending: false }).limit(1)
    ]);

    panel.textContent = "";

    var promo = out[2].data && out[2].data[0];
    if (promo && promo.status === "promoted") {
      var banner = node("div", "promo-banner");
      banner.appendChild(node("strong", null, "Congratulations!"));
      banner.appendChild(node("p", null, row.full_name + " has been promoted to " + promo.to_class + "."));
      banner.appendChild(node("p", "child-meta", "Academic records remain available for future reference."));
      panel.appendChild(banner);
    }

    panel.appendChild(node("h4", null, "Published results"));
    renderResults(panel, out[0]);

    panel.appendChild(node("h4", null, "Recent attendance"));
    renderAttendance(panel, out[1]);
  }

  function renderResults(panel, res) {
    if (res.error) { panel.appendChild(node("p", "muted", "Results could not be loaded.")); return; }
    if (!res.data || res.data.length === 0) {
      panel.appendChild(node("p", "muted", "No results have been published yet."));
      return;
    }

    var groups = {}, order = [];
    res.data.forEach(function (r) {
      var key = r.session_name + " — " + r.term_name;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });

    order.forEach(function (key) {
      panel.appendChild(node("h5", null, key));

      var wrap = node("div", "table-scroll");
      var table = node("table", "result-table");
      var thead = node("thead");
      var hr = node("tr");
      ["Subject", "CA", "Exam", "Total", "Grade", "Position"].forEach(function (h) {
        var th = node("th", null, h); th.scope = "col"; hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);

      var tbody = node("tbody");
      var remarks = [];
      groups[key].sort(function (a, b) { return a.subject_name.localeCompare(b.subject_name); })
        .forEach(function (r) {
          var tr = node("tr");
          tr.appendChild(node("td", null, r.subject_name));
          tr.appendChild(node("td", null, num(r.ca_score)));
          tr.appendChild(node("td", null, num(r.exam_score)));
          tr.appendChild(node("td", "strong", num(r.total_score)));
          tr.appendChild(node("td", "strong", r.grade || "–"));
          tr.appendChild(node("td", null, r.class_position ? String(r.class_position) : "–"));
          tbody.appendChild(tr);
          if (r.teacher_remarks) remarks.push(r.subject_name + ": " + r.teacher_remarks);
        });
      table.appendChild(tbody);
      wrap.appendChild(table);
      panel.appendChild(wrap);

      remarks.forEach(function (t) { panel.appendChild(node("p", "child-meta", "Teacher's remark — " + t)); });
    });
  }

  function renderAttendance(panel, res) {
    if (res.error) { panel.appendChild(node("p", "muted", "Attendance could not be loaded.")); return; }
    if (!res.data || res.data.length === 0) {
      panel.appendChild(node("p", "muted", "No attendance has been recorded yet."));
      return;
    }
    var ul = node("ul", "attendance-list");
    res.data.forEach(function (a) {
      var li = node("li");
      li.appendChild(node("span", null, fmtDate(a.attendance_date)));
      var present = a.status === "present";
      li.appendChild(node("span", "badge " + (present ? "badge-ok" : "badge-bad"), present ? "Present" : "Absent"));
      ul.appendChild(li);
    });
    panel.appendChild(ul);
    panel.appendChild(node("p", "child-meta", "To discuss an absence, please contact the school administrator directly."));
  }

  /* ---------- REGISTER A CHILD ---------- */
  function wireRegistration() {
    var form = $("register-form");
    var note = $("reg-note");
    var photoInput = $("reg-photo");
    var preview = $("photo-preview");

    var meta = (user && user.user_metadata && user.user_metadata.relationship) || "";
    if (["parent", "guardian", "other"].indexOf(meta) !== -1) $("reg-relationship").value = meta;

    photoInput.addEventListener("change", function () {
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      preview.hidden = true;
      var f = photoInput.files && photoInput.files[0];
      if (!f) return;
      if (!TYPES[f.type]) { note.textContent = "The photograph must be a JPEG, PNG or WebP image."; photoInput.value = ""; return; }
      if (f.size > MAX_BYTES) { note.textContent = "The photograph must be 2 MB or smaller."; photoInput.value = ""; return; }
      note.textContent = "";
      previewUrl = URL.createObjectURL(f);
      preview.src = previewUrl;
      preview.hidden = false;
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var schoolId = $("reg-school").value;
      var name = $("reg-name").value.trim();
      var admission = $("reg-admission").value.trim();
      var className = $("reg-class").value.trim();
      var relationship = $("reg-relationship").value;
      var file = photoInput.files && photoInput.files[0];
      var confirmed = $("reg-confirm").checked;

      if (!schoolId || !name || !admission || !className || !relationship) {
        note.textContent = "Please complete all the required fields."; return;
      }
      if (name.length < 2) { note.textContent = "Please enter the child's full name."; return; }
      if (!file) { note.textContent = "A passport photograph is required."; return; }
      if (!TYPES[file.type] || file.size > MAX_BYTES) {
        note.textContent = "The photograph must be a JPEG, PNG or WebP image of 2 MB or less."; return;
      }
      if (!confirmed) { note.textContent = "Please confirm that the information is accurate."; return; }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      note.textContent = "Uploading photograph…";

      var path = user.id + "/" + crypto.randomUUID() + "." + TYPES[file.type];
      var up = await sb.storage.from("passports").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        btn.disabled = false;
        note.textContent = "The photograph could not be uploaded. Please try again.";
        return;
      }

      note.textContent = "Submitting your request…";
      var rpc = await sb.rpc("register_child", {
        p_school_id: schoolId,
        p_full_name: name,
        p_admission_number: admission,
        p_class_name: className,
        p_passport_path: path,
        p_relationship: relationship
      });
      btn.disabled = false;

      if (rpc.error) {
        var m = rpc.error.message || "";
        if (m.indexOf("Too many pending") !== -1) {
          note.textContent = "You already have several requests waiting for verification. Please wait for the school to review them.";
        } else if (m.indexOf("School not available") !== -1) {
          note.textContent = "That school is not available for registration.";
        } else {
          note.textContent = "We could not submit the request. Please check the details and try again.";
        }
        return;
      }

      form.reset();
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      preview.hidden = true;
      if (["parent", "guardian", "other"].indexOf(meta) !== -1) $("reg-relationship").value = meta;
      note.textContent = "Request submitted. The school will verify it, and the status will update below.";
      await loadChildren();
      $("children-list").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- START ---------- */
  async function init() {
    if (!sb) { $("children-list").textContent = "The service is unavailable. Please try again later."; return; }

    var s = await sb.auth.getSession();
    if (!s.data || !s.data.session) { goLogin(); return; }
    user = s.data.session.user;

    var p = await sb.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (p.error || !p.data || p.data.role !== "parent") { await sb.auth.signOut(); goLogin(); return; }

    $("welcome-name").textContent = p.data.full_name || "Parent";

    $("signout-btn").addEventListener("click", async function () {
      await sb.auth.signOut();
      goLogin();
    });
    sb.auth.onAuthStateChange(function (evt) { if (evt === "SIGNED_OUT") goLogin(); });

    wireRegistration();
    await Promise.all([loadSchools(), loadChildren()]);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
