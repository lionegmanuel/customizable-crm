/**
 - Renderizar la pantalla de login/registro.
 - Manejar Email/Password y Google Sign-In.
 - Notificar al App cuando el estado de auth cambia.
  Exponer el usuario activo via AuthService.currentUser().
 */

const AuthService = (() => {
  let _onLogin = null;
  let _onLogout = null;
  let _mode = "login";

  /* ─── API ─── */

  function init({ onLogin, onLogout }) {
    _onLogin = onLogin;
    _onLogout = onLogout;

    Auth.onAuthStateChanged((user) => {
      if (user) {
        _hideAuthScreen();
        if (_onLogin) _onLogin(user);
      } else {
        _showAuthScreen();
        if (_onLogout) _onLogout();
      }
    });
  }

  function currentUser() {
    return Auth.currentUser;
  }

  function logout() {
    Auth.signOut();
  }

  /* ─── Pantalla de auth ─── */

  function _showAuthScreen() {
    document.getElementById("app-shell").style.display = "none";
    const screen = document.getElementById("auth-screen");
    screen.style.display = "flex";
    _renderAuthScreen();
  }

  function _hideAuthScreen() {
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("app-shell").style.display = "flex";
  }

  function _renderAuthScreen() {
    const screen = document.getElementById("auth-screen");
    const isLogin = _mode === "login";

    screen.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-mark" style="width:38px;height:38px;font-size:18px">V</div>
          <span style="font-size:20px;font-weight:600;letter-spacing:-0.5px">Velinex CRM</span>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab ${isLogin ? "active" : ""}" id="tab-login">Iniciar sesión</button>
          <button class="auth-tab ${!isLogin ? "active" : ""}" id="tab-register">Registrarse</button>
        </div>

        <div id="auth-error" class="auth-error" style="display:none"></div>

        ${
          !isLogin
            ? `
        <div class="field-group">
          <label class="field-label" for="auth-name">Nombre</label>
          <input id="auth-name" type="text" placeholder="Tu nombre" autocomplete="name"/>
        </div>`
            : ""
        }

        <div class="field-group">
          <label class="field-label" for="auth-email">Email</label>
          <input id="auth-email" type="email" placeholder="tu@email.com" autocomplete="email"/>
        </div>

        <div class="field-group">
          <label class="field-label" for="auth-pass">Contraseña</label>
          <input id="auth-pass" type="password" placeholder="${isLogin ? "Tu contraseña" : "Mínimo 6 caracteres"}" autocomplete="${isLogin ? "current-password" : "new-password"}"/>
        </div>

        ${
          isLogin
            ? `
        <div style="text-align:right;margin:-6px 0 10px">
          <button class="auth-link" id="btn-forgot">¿Olvidaste tu contraseña?</button>
        </div>`
            : ""
        }

        <button class="btn btn--primary auth-btn-main" id="btn-auth-submit">
          ${isLogin ? "Iniciar sesión" : "Crear cuenta"}
        </button>

        <div class="auth-divider"><span>o</span></div>

        <button class="btn auth-btn-google" id="btn-google">
          <svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-21.5 0-1.4-.1-2.7-.5-4.5z"/>
          </svg>
          Continuar con Google
        </button>

        <p class="auth-footer-text">
          ${
            isLogin
              ? '¿No tenés cuenta? <button class="auth-link" id="switch-to-register">Registrate gratis</button>'
              : '¿Ya tenés cuenta? <button class="auth-link" id="switch-to-login">Iniciá sesión</button>'
          }
        </p>
      </div>`;

    _attachAuthHandlers(isLogin);
  }

  function _attachAuthHandlers(isLogin) {
    document.getElementById("tab-login")?.addEventListener("click", () => {
      _mode = "login";
      _renderAuthScreen();
    });
    document.getElementById("tab-register")?.addEventListener("click", () => {
      _mode = "register";
      _renderAuthScreen();
    });
    document
      .getElementById("switch-to-register")
      ?.addEventListener("click", () => {
        _mode = "register";
        _renderAuthScreen();
      });
    document
      .getElementById("switch-to-login")
      ?.addEventListener("click", () => {
        _mode = "login";
        _renderAuthScreen();
      });

    document
      .getElementById("btn-auth-submit")
      ?.addEventListener("click", () => {
        isLogin ? _handleLogin() : _handleRegister();
      });

    document
      .getElementById("btn-google")
      ?.addEventListener("click", _handleGoogle);

    document
      .getElementById("btn-forgot")
      ?.addEventListener("click", _handleForgot);

    // Enter para submit
    ["auth-email", "auth-pass", "auth-name"].forEach((id) => {
      document.getElementById(id)?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") isLogin ? _handleLogin() : _handleRegister();
      });
    });
  }

  /* ─── Handlers de auth ─── */

  function _setLoading(loading) {
    const btn = document.getElementById("btn-auth-submit");
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading
        ? "Cargando..."
        : _mode === "login"
          ? "Iniciar sesión"
          : "Crear cuenta";
    }
  }

  function _showError(msg) {
    const el = document.getElementById("auth-error");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  function _clearError() {
    const el = document.getElementById("auth-error");
    if (el) el.style.display = "none";
  }

  function _handleLogin() {
    const email = document.getElementById("auth-email")?.value?.trim();
    const pass = document.getElementById("auth-pass")?.value;
    if (!email || !pass) {
      _showError("Completá todos los campos.");
      return;
    }
    _clearError();
    _setLoading(true);
    Auth.signInWithEmailAndPassword(email, pass).catch((err) => {
      _showError(_friendlyError(err.code));
      _setLoading(false);
    });
  }

  function _handleRegister() {
    const name = document.getElementById("auth-name")?.value?.trim();
    const email = document.getElementById("auth-email")?.value?.trim();
    const pass = document.getElementById("auth-pass")?.value;
    if (!name || !email || !pass) {
      _showError("Completá todos los campos.");
      return;
    }
    if (pass.length < 6) {
      _showError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    _clearError();
    _setLoading(true);
    Auth.createUserWithEmailAndPassword(email, pass)
      .then((cred) => cred.user.updateProfile({ displayName: name }))
      .catch((err) => {
        _showError(_friendlyError(err.code));
        _setLoading(false);
      });
  }

  function _handleGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    Auth.signInWithPopup(provider).catch((err) =>
      _showError(_friendlyError(err.code)),
    );
  }

  function _handleForgot() {
    const email = document.getElementById("auth-email")?.value?.trim();
    if (!email) {
      _showError("Ingresá tu email primero.");
      return;
    }
    Auth.sendPasswordResetEmail(email)
      .then(() => {
        _showError("✓ Te enviamos un link para restablecer tu contraseña.");
      })
      .catch((err) => _showError(_friendlyError(err.code)));
  }

  function _friendlyError(code) {
    const map = {
      "auth/user-not-found": "No existe una cuenta con ese email.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/email-already-in-use": "Ese email ya está registrado.",
      "auth/invalid-email": "El email no es válido.",
      "auth/weak-password": "La contraseña es muy débil.",
      "auth/popup-closed-by-user":
        "Cerraste la ventana de Google antes de completar.",
      "auth/network-request-failed": "Error de conexión. Revisá tu internet.",
      "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
      "auth/invalid-credential":
        "Credenciales inválidas. Verificá email y contraseña.",
    };
    return map[code] || "Ocurrió un error. Intentá de nuevo.";
  }

  return { init, currentUser, logout };
})();
