import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

/** ---------- Types ---------- */
type Entreprise = {
  id?: number
  user_id: string
  nom: string
  adresse: string
  telephone: string
  email: string
  siret: string
  signature_data_url?: string | null
}
type Prestation = { id?: number; user_id: string; nom: string; prix: number }
type Ligne = { id: string; nom: string; qte: number; pu: number }
type Dossier = {
  id?: number
  user_id: string
  reference: string
  defunt_nom: string
  defunt_prenom: string
  famille_contact: string
  ceremonie_date?: string | null
  ceremonie_lieu?: string | null
  prestations: string[]
  marbrerie: Ligne[]
  autres: Ligne[]
  cree_le: string
  modifie_le: string
  archive?: boolean
}

/** ---------- Utils ---------- */
const € = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0)
const uid = () => Math.random().toString(36).slice(2, 9)

/** Prestations par défaut (seed si vide) */
const defaultPrestations: Omit<Prestation, 'id' | 'user_id'>[] = [
  { nom: 'Mise en bière et fermeture du cercueil', prix: 290 },
  { nom: 'Cercueil chêne – gamme classique', prix: 780 },
  { nom: 'Capitonnage tissu écru', prix: 180 },
  { nom: 'Transport (forfait 50 km)', prix: 220 },
  { nom: 'Maître de cérémonie', prix: 200 },
  { nom: 'Démarches administratives', prix: 95 },
  { nom: 'Ouverture/fermeture de caveau', prix: 350 },
  { nom: 'Urne funéraire – standard', prix: 120 },
]

/** ---------- Auth minimal (email magic link) ---------- */
function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  async function login(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else setSent(true)
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6f7fb' }}>
      <form onSubmit={login} style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 6px 30px rgba(0,0,0,.07)', width: 380, maxWidth: '90%' }}>
        <h2 style={{ marginTop: 0 }}>Connexion</h2>
        {sent ? (
          <p>Un lien de connexion vous a été envoyé.</p>
        ) : (
          <>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" style={{ width: '100%', padding: 10, margin: '8px 0' }} />
            <button type="submit" style={{ padding: '10px 14px' }}>Recevoir le lien</button>
          </>
        )}
      </form>
    </div>
  )
}

/** ---------- App root ---------- */
export default function App() {
  const [session, setSession] = useState<any>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (!session) return <Auth />
  return <Dashboard userId={session.user.id} email={session.user.email} />
}

/** ---------- Dashboard ---------- */
function Dashboard({ userId, email }: { userId: string; email: string }) {
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [prestations, setPrestations] = useState<Prestation[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [tab, setTab] = useState<'dossiers' | 'tarifs' | 'param'>('dossiers')
  const [q, setQ] = useState('')
  const [currentId, setCurrentId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = async () => {
      // Entreprise
      const { data: e } = await supabase.from('entreprise').select('*').eq('user_id', userId).maybeSingle()
      if (!e) {
        const empty: Entreprise = {
          user_id: userId,
          nom: 'Pompes Funèbres Loubet-Victor',
          adresse: '',
          telephone: '',
          email: email || '',
          siret: '',
          signature_data_url: null,
        }
        const { data: ins } = await supabase.from('entreprise').insert(empty).select().single()
        setEntreprise(ins as Entreprise)
      } else setEntreprise(e as Entreprise)

      // Prestations (+ seed)
      let { data: pr } = await supabase.from('prestations').select('*').eq('user_id', userId).order('id', { ascending: false })
      if (!pr || pr.length === 0) {
        const toIns = defaultPrestations.map((p) => ({ ...p, user_id: userId }))
        const { data: seeded } = await supabase.from('prestations').insert(toIns).select()
        pr = seeded || []
      }
      setPrestations(pr as Prestation[])

      // Dossiers
      const { data: ds } = await supabase.from('dossiers').select('*').eq('user_id', userId).order('modifie_le', { ascending: false })
      setDossiers((ds || []) as Dossier[])
    }
    load()
  }, [userId, email])

  const current = useMemo(() => dossiers.find((d) => d.id === currentId) || null, [dossiers, currentId])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return dossiers.filter((d) => !d.archive)
    return dossiers.filter(
      (d) =>
        !d.archive &&
        (d.reference.toLowerCase().includes(s) ||
          `${d.defunt_nom} ${d.defunt_prenom}`.toLowerCase().includes(s) ||
          (d.famille_contact || '').toLowerCase().includes(s) ||
          (d.ceremonie_lieu || '').toLowerCase().includes(s)),
    )
  }, [q, dossiers])

  async function newDossier() {
    const now = new Date().toISOString()
    const d: Dossier = {
      user_id: userId,
      reference: `PFV-${new Date().getFullYear()}-${String(dossiers.length + 1).padStart(4, '0')}`,
      defunt_nom: '',
      defunt_prenom: '',
      famille_contact: '',
      prestations: [],
      marbrerie: [],
      autres: [],
      cree_le: now,
      modifie_le: now,
    }
    const { data: ins, error } = await supabase.from('dossiers').insert(d).select().single()
    if (error) return alert(error.message)
    setDossiers((prev) => [ins as Dossier, ...prev])
    setCurrentId((ins as any).id as number)
  }

  async function updateCurrent(patch: Partial<Dossier>) {
    if (!current) return
    const upd = { ...current, ...patch, modifie_le: new Date().toISOString() }
    const { data: saved, error } = await supabase.from('dossiers').update(upd).eq('id', current.id).select().single()
    if (error) return alert(error.message)
    setDossiers((prev) => prev.map((d) => (d.id === current.id ? (saved as Dossier) : d)))
  }

  async function removeDossier() {
    if (!current) return
    if (!confirm('Archiver ce dossier ?')) return
    await updateCurrent({ archive: true } as any)
    setCurrentId(null)
  }

  // Export / Import JSON
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ dossiers, prestations, entreprise }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pfv_export.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  function importJSON(file: File) {
    const r = new FileReader()
    r.onload = async () => {
      try {
        const data = JSON.parse(String(r.result))
        if (Array.isArray(data.prestations)) {
          for (const p of data.prestations) await supabase.from('prestations').upsert({ user_id: userId, nom: p.nom, prix: p.prix })
        }
        if (Array.isArray(data.dossiers)) {
          for (const d of data.dossiers) await supabase.from('dossiers').insert({ ...d, id: undefined, user_id: userId })
        }
        alert('Import terminé'); location.reload()
      } catch { alert('Fichier invalide') }
    }
    r.readAsText(file)
  }

  async function saveEntreprisePatch(patch: Partial<Entreprise>) {
    if (!entreprise) return
    const { data, error } = await supabase.from('entreprise').update({ ...entreprise, ...patch }).eq('id', entreprise.id).select().single()
    if (error) return alert(error.message)
    setEntreprise(data as Entreprise)
  }

  const map = new Map(prestations.map((p) => [String(p.id), p] as const))
  const totalPrest = (d: Dossier) => d.prestations.reduce((s, id) => s + (map.get(String(id))?.prix || 0), 0)
  const totalLignes = (lst: Ligne[]) => lst.reduce((s, l) => s + l.qte * (l.pu || 0), 0)
  const totalDossier = (d: Dossier) => totalPrest(d) + totalLignes(d.marbrerie) + totalLignes(d.autres)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ borderRight: '1px solid #eee', padding: 16, background: 'white' }}>
        <h3 style={{ margin: 0 }}>{entreprise?.nom || '...'}</h3>
        <div style={{ color: '#666', fontSize: 12 }}>{entreprise?.adresse}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={newDossier}>➕ Nouveau dossier</button>
          <button onClick={exportJSON}>⬇️ Exporter</button>
          <button onClick={() => fileRef.current?.click()}>⬆️ Importer</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); (e.target as HTMLInputElement).value = '' }} />
        </div>

        <div style={{ display: 'grid', gap: 6, marginTop: 16 }}>
          <button onClick={() => setTab('dossiers')} style={{ textAlign: 'left', background: tab === 'dossiers' ? '#eef7ee' : 'white' }}>📁 Dossiers</button>
          <button onClick={() => setTab('tarifs')} style={{ textAlign: 'left', background: tab === 'tarifs' ? '#eef7ee' : 'white' }}>💶 Tarifs</button>
          <button onClick={() => setTab('param')} style={{ textAlign: 'left', background: tab === 'param' ? '#eef7ee' : 'white' }}>⚙️ Paramètres</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => supabase.auth.signOut()}>🚪 Se déconnecter</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: 20 }}>
        {tab === 'dossiers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Liste */}
            <div>
              <input placeholder="Recherche (nom, famille, référence, lieu…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', padding: 8 }} />
              <div style={{ marginTop: 8, maxHeight: '60vh', overflow: 'auto', display: 'grid', gap: 8 }}>
                {filtered.map((d) => (
                  <button key={String(d.id)} style={{ textAlign: 'left', padding: 8, border: '1px solid #eee', borderRadius: 8, background: 'white' }} onClick={() => setCurrentId(d.id!)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{d.defunt_prenom || '?'} {d.defunt_nom || '?'}</strong>
                      <span style={{ color: '#333' }}>{€(totalDossier(d))}</span>
                    </div>
                    <small style={{ color: '#666' }}>{d.reference}{d.ceremonie_lieu ? ' • ' + d.ceremonie_lieu : ''}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* Détail */}
            <div>
              {current ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={removeDossier}>🗑️ Archiver</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input placeholder="Nom défunt" value={current.defunt_nom} onChange={(e) => updateCurrent({ defunt_nom: e.target.value } as any)} />
                    <input placeholder="Prénom défunt" value={current.defunt_prenom} onChange={(e) => updateCurrent({ defunt_prenom: e.target.value } as any)} />
                    <input placeholder="Lieu cérémonie" value={current.ceremonie_lieu || ''} onChange={(e) => updateCurrent({ ceremonie_lieu: e.target.value } as any)} />
                    <input type="datetime-local" value={current.ceremonie_date || ''} onChange={(e) => updateCurrent({ ceremonie_date: e.target.value } as any)} />
                    <input placeholder="Famille contact" value={current.famille_contact} onChange={(e) => updateCurrent({ famille_contact: e.target.value } as any)} />
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, margin: '8px 0' }}>Prestations</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {prestations.map((p) => {
                        const checked = current.prestations.includes(String(p.id))
                        return (
                          <label key={String(p.id)} style={{ border: '1px solid #eee', padding: 8, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                            <span>{p.nom}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong>{€(p.prix)}</strong>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const set = new Set(current.prestations.map(String))
                                  if (e.target.checked) set.add(String(p.id))
                                  else set.delete(String(p.id))
                                  updateCurrent({ prestations: Array.from(set) } as any)
                                }}
                              />
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px dashed #bbb', borderRadius: 8, padding: 24, textAlign: 'center', color: '#666' }}>
                  Sélectionnez un dossier
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tarifs' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Catalogue prestations</div>
            {prestations.map((p) => (
              <div key={String(p.id)} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
                <input value={p.nom} onChange={async (e) => {
                  const { data } = await supabase.from('prestations').update({ nom: e.target.value }).eq('id', p.id).select().single()
                  if (data) setPrestations((prev) => prev.map((x) => (x.id === p.id ? (data as any) : x)))
                }} />
                <input type="number" value={p.prix} onChange={async (e) => {
                  const { data } = await supabase.from('prestations').update({ prix: Number(e.target.value) }).eq('id', p.id).select().single()
                  if (data) setPrestations((prev) => prev.map((x) => (x.id === p.id ? (data as any) : x)))
                }} />
                <button onClick={async () => {
                  await supabase.from('prestations').delete().eq('id', p.id)
                  setPrestations((prev) => prev.filter((x) => x.id !== p.id))
                }}>Supprimer</button>
              </div>
            ))}
            <button onClick={async () => {
              const { data } = await supabase.from('prestations').insert({ user_id: userId, nom: '', prix: 0 }).select().single()
              if (data) setPrestations((prev) => [data as any, ...prev])
            }}>➕ Ajouter</button>
          </div>
        )}

        {tab === 'param' && entreprise && (
          <div style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Nom" value={entreprise.nom} onChange={(e) => saveEntreprisePatch({ nom: e.target.value })} />
            <input placeholder="SIRET" value={entreprise.siret} onChange={(e) => saveEntreprisePatch({ siret: e.target.value })} />
            <input placeholder="Adresse" value={entreprise.adresse} onChange={(e) => saveEntreprisePatch({ adresse: e.target.value })} />
            <input placeholder="Téléphone" value={entreprise.telephone} onChange={(e) => saveEntreprisePatch({ telephone: e.target.value })} />
            <input placeholder="Email" value={entreprise.email} onChange={(e) => saveEntreprisePatch({ email: e.target.value })} />
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Signature (PNG/JPEG)</div>
              <input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return
                const r = new FileReader(); r.onload = () => saveEntreprisePatch({ signature_data_url: String(r.result) }); r.readAsDataURL(f)
              }} />
              {entreprise.signature_data_url && <img src={entreprise.signature_data_url} alt="signature" style={{ height: 48, marginTop: 8 }} />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
