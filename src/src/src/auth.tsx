import React, { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else setSent(true)
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>
      <form onSubmit={login} style={{background:'white',padding:24,borderRadius:12,boxShadow:'0 6px 30px rgba(0,0,0,.07)',width:380,maxWidth:'90%'}}>
        <h2 style={{marginTop:0}}>Connexion</h2>
        {sent ? (
          <p>Un lien de connexion vous a été envoyé.</p>
        ) : (
          <>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                   placeholder="Votre email" style={{width:'100%',padding:10,margin:'8px 0'}}/>
            <button type="submit" style={{padding:'10px 14px'}}>Recevoir le lien</button>
          </>
        )}
      </form>
    </div>
  )
}
