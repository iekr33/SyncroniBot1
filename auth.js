const API_URL = "http://localhost:3000";
// ===============================
// REGISTER
// ===============================
document.getElementById("formRegister").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerPasswordConfirm").value;

  if (password !== confirmPassword) {
    alert("Las contraseñas no coinciden");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Usuario registrado correctamente");
    } else {
      alert(data.message || "Error al registrar");
    }

  } catch (error) {
    console.error(error);
    alert("Error de conexión con el servidor");
  }
});


// ===============================
// LOGIN
// ===============================
document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Login correcto");

      // Guardar token
      localStorage.setItem("token", data.token);

      // Opcional: mostrar usuario
      document.getElementById("authButtons").style.display = "none";
      document.getElementById("userMenu").classList.add("visible");

    } else {
      alert(data.message || "Error al iniciar sesión");
    }

  } catch (error) {
    console.error(error);
    alert("Error de conexión con el servidor");
  }
});
