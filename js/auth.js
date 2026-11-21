/* =========================================
   EDU. DISTRICT III - Sign in & parent sign-up
   ========================================= */
(function () {
  "use strict";

  var sb = window.sb;
  var $ = function (id) { return document.getElementById(id); };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = busy; btn.setAttribute("aria-busy", String(busy)); }
  }

  function say(note, text) { note.textContent = text; }

  async function routeByRole(note) {
    var res = await sb.auth.getUser();
    var user = res.data && res.data.user;
    if (!user) return;

    var p = await sb.from("profiles").select("role").eq("id", user.id).single();
    if (p.error || !p.data) {
      if (note) say(note, "We could not load your account. Please try again.");
      await sb.auth.signOut();
      return;
    }
    if (p.data.role === "parent") {
      window.location.replace("parent-dashboard.html");
      return;
    }
    if (note) say(note, "The dashboard for your account type is not available yet.");
    await sb.auth.signOut();
  }

  /* ---------- SIGN IN ---------- */
  var loginForm = $("login-form");
  var loginNote = $("login-note");

  if (loginForm && loginNote) {
    if (!sb) { say(loginNote, "The sign-in service is unavailable. Please try again later."); return; }

    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) routeByRole(null);
    });

    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var identity = $("identity").value.trim();
      var password = $("password").value;

      if (!identity || !password) { say(loginNote, "Please enter your login details."); return; }

      if (identity.indexOf("@") === -1) {
        say(loginNote, "Sign-in with an admission number is not available yet. Parents and administrators sign in with their registered email.");
        return;
      }
      if (!EMAIL_RE.test(identity)) { say(loginNote, "Please enter a valid email address."); return; }

      setBusy(loginForm, true);
      say(loginNote, "Signing in…");

      var result = await sb.auth.signInWithPassword({ email: identity, password: password });

      if (result.error) {
        setBusy(loginForm, false);
        if (result.error.code === "email_not_confirmed") {
          say(loginNote, "Please confirm your email address first. Check your inbox for the confirmation link.");
        } else if (result.error.status === 429) {
          say(loginNote, "Too many attempts. Please wait a few minutes and try again.");
        } else {
          say(loginNote, "Incorrect email or password.");
        }
        return;
      }

      await routeByRole(loginNote);
      setBusy(loginForm, false);
    });
  }

  /* ---------- PARENT SIGN-UP ---------- */
  var signupForm = $("signup-form");
  var signupNote = $("signup-note");

  if (signupForm && signupNote) {
    if (!sb) { say(signupNote, "The registration service is unavailable. Please try again later."); return; }

    signupForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var fullname = $("fullname").value.trim();
      var email = $("email").value.trim();
      var relationship = $("relationship").value;
      var password = $("password").value;
      var confirmPassword = $("confirm-password").value;

      if (!fullname || !email || !relationship || !password || !confirmPassword) {
        say(signupNote, "Please complete all the required fields."); return;
      }
      if (fullname.length < 2 || fullname.length > 120) {
        say(signupNote, "Please enter your full name."); return;
      }
      if (!EMAIL_RE.test(email)) { say(signupNote, "Please enter a valid email address."); return; }
      if (password.length < 8) { say(signupNote, "Your password must contain at least 8 characters."); return; }
      if (password !== confirmPassword) { say(signupNote, "Your passwords do not match."); return; }

      setBusy(signupForm, true);
      say(signupNote, "Creating your account…");

      var result = await sb.auth.signUp({
        email: email,
        password: password,
        options: {
          // The role is NOT taken from here. The database makes every sign-up a parent.
          data: { full_name: fullname, relationship: relationship },
          emailRedirectTo: new URL("login.html", window.location.href).href
        }
      });

      setBusy(signupForm, false);

      if (result.error) {
        if (result.error.status === 429) {
          say(signupNote, "Too many attempts. Please wait a few minutes and try again.");
        } else if (result.error.code === "weak_password") {
          say(signupNote, "That password is too weak. Please choose a longer, less common password.");
        } else {
          say(signupNote, "We could not create your account. Please check your details and try again.");
        }
        return;
      }

      signupForm.reset();

      if (result.data && result.data.session) {
        window.location.replace("parent-dashboard.html");   // email confirmation switched off
        return;
      }
      // Same message whether or not the email already exists (prevents account probing).
      say(signupNote, "Almost done. If this email can be registered, we have sent a confirmation link to it. Open the link, then sign in.");
    });
  }
})();
