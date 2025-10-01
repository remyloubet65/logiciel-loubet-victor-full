import { useState, useEffect } from "react"
import { supabase } from "./supabase"

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState("")

  // Vérifie si un utilisateur est déjà connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Fonction de connexion par e-mail magique
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert("Lien de connexion envoyé ! Vérifie ta boîte mail 📧")
  }

  // Fonction de déconnexion
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // Si pas connecté → formulaire de connexion
  if (!session)
    return (
      <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "80px" }}>
        <h1>Logiciel Loubet-Victor 🔐</h1>
        <p>Connectez-vous pour accéder à la gestion interne.</p>
        <form onSubmit={handleLogin} style={{ marginTop: "20px" }}>
          <input
            type="email"
            placeholder="Votre e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px", fontSize: "16px", width: "250px" }}
          />
          <br />
          <button
            type="submit"
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Se connecter
          </button>
        </form>
      </div>
    )

  // Si connecté → tableau de bord simplifié
  return (
    <div style={{ fontFamily: "Arial", textAlign: "center", marginTop: "80px" }}>
      <h1>Bienvenue dans Logiciel Loubet-Victor ⚰️</h1>
      <p>Session active pour : <strong>{session.user.email}</strong></p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: "15px",
          padding: "10px 20px",
          background: "darkred",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Se déconnecter
      </button>
    </div>
  )
}
