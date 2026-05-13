#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

loadEnvFile('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'Gymnastplanner@gmail.com').trim()
const password = process.env.SEED_TEST_PASSWORD || 'TestGym2026!'

const clubs = [
  {
    name: 'Club Gimnasia Andes',
    coachEmail: 'coach.andes@test.gymnastplanner.com',
    coachName: 'Coach Andes',
    groups: [
      { nombre: 'Pre-equipo Andes', nivel: 'Nivel 2' },
      { nombre: 'Equipo Competitivo Andes', nivel: 'Nivel 5' },
    ],
  },
  {
    name: 'Club Elite Norte',
    coachEmail: 'coach.elite@test.gymnastplanner.com',
    coachName: 'Coach Elite',
    groups: [
      { nombre: 'Elite Norte Base', nivel: 'Nivel 3' },
      { nombre: 'Elite Norte Avanzado', nivel: 'Nivel 8' },
    ],
  },
  {
    name: 'Escuela Base Sur',
    coachEmail: 'coach.base@test.gymnastplanner.com',
    coachName: 'Coach Base',
    groups: [
      { nombre: 'Iniciacion Sur', nivel: 'Nivel 1' },
      { nombre: 'Desarrollo Sur', nivel: 'Nivel 4' },
    ],
  },
]

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

async function main() {
  if (!url || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const superAdmin = await ensureAuthUser(supabase, {
    email: superAdminEmail,
    password,
    name: 'Super Admin GymnastPlanner',
  })

  const seededClubs = []
  for (const club of clubs) {
    const clubRow = await ensureClub(supabase, club.name)
    const coach = await ensureAuthUser(supabase, {
      email: club.coachEmail,
      password,
      name: club.coachName,
    })
    await ensureProfile(supabase, {
      userId: coach.id,
      email: club.coachEmail,
      name: club.coachName,
      clubId: clubRow.id,
    })

    const groups = []
    for (const group of club.groups) {
      groups.push(await ensureGroup(supabase, clubRow.id, group))
    }

    seededClubs.push({
      club: club.name,
      clubId: clubRow.id,
      coachEmail: club.coachEmail,
      coachUserId: coach.id,
      groups: groups.map((group) => `${group.nombre} (${group.nivel})`),
    })
  }

  console.log(JSON.stringify({
    password,
    superAdmin: { email: superAdminEmail, userId: superAdmin.id },
    clubs: seededClubs,
  }, null, 2))
}

async function ensureAuthUser(supabase, { email, password, name }) {
  const existing = await findUserByEmail(supabase, email)
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { nombre: name },
    })
    if (error) throw new Error(`No se pudo actualizar ${email}: ${error.message}`)
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: name },
  })
  if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message || 'sin usuario'}`)
  return data.user
}

async function findUserByEmail(supabase, email) {
  const target = email.trim().toLowerCase()
  let page = 1

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new Error(`No se pudieron listar usuarios: ${error.message}`)

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === target)
    if (found) return found
    if (data.users.length < 100) return null
    page += 1
  }

  return null
}

async function ensureClub(supabase, name) {
  const { data: existing, error: selectError } = await supabase
    .from('clubs')
    .select('id, nombre')
    .eq('nombre', name)
    .maybeSingle()

  if (selectError) throw new Error(`No se pudo consultar club ${name}: ${selectError.message}`)

  if (existing) {
    const { data, error } = await supabase
      .from('clubs')
      .update({ estado: 'aprobado', acceso_biblioteca_elite: true })
      .eq('id', existing.id)
      .select('id, nombre')
      .single()
    if (error) throw new Error(`No se pudo actualizar club ${name}: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert([{ nombre: name, estado: 'aprobado', acceso_biblioteca_elite: true }])
    .select('id, nombre')
    .single()

  if (error) throw new Error(`No se pudo crear club ${name}: ${error.message}`)
  return data
}

async function ensureProfile(supabase, { userId, email, name, clubId }) {
  const { error } = await supabase
    .from('perfiles')
    .upsert({ id: userId, email, nombre: name, club_id: clubId }, { onConflict: 'id' })

  if (error) throw new Error(`No se pudo crear perfil ${email}: ${error.message}`)
}

async function ensureGroup(supabase, clubId, group) {
  const { data: existing, error: selectError } = await supabase
    .from('grupos')
    .select('id, nombre, nivel')
    .eq('club_id', clubId)
    .eq('nombre', group.nombre)
    .maybeSingle()

  if (selectError) throw new Error(`No se pudo consultar grupo ${group.nombre}: ${selectError.message}`)
  if (existing) return existing

  const { data, error } = await supabase
    .from('grupos')
    .insert([{ ...group, club_id: clubId }])
    .select('id, nombre, nivel')
    .single()

  if (error) throw new Error(`No se pudo crear grupo ${group.nombre}: ${error.message}`)
  return data
}

function loadEnvFile(fileName) {
  const envPath = path.join(process.cwd(), fileName)
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}
