/* ClinicalTrials.gov API utilities ported from provided Python logic */

export type FlatTrial = {
  nctId?: string
  orgStudyId?: string
  organization?: string
  briefTitle?: string
  officialTitle?: string
  overallStatus?: string
  startDate?: string
  completionDate?: string
  leadSponsor?: string
  responsibleParty?: string
  fdaRegDrug?: boolean
  fdaRegDevice?: boolean
  briefSummary?: string
  detailedDescription?: string
  conditions?: string[]
  studyType?: string
  enrollment?: number
  phases: string[]
  primaryOutcome?: string
  minAge?: string
  sex?: string
  criteria?: string
  cities: string[]
  states: string[]
}

export async function fetchStudyByNctId(nctId: string): Promise<FlatTrial | null> {
  if (!nctId) return null
  const baseUrl = "https://clinicaltrials.gov/api/v2/studies"
  // Fallback search by term, then filter exact NCT ID
  const params = new URLSearchParams({ "query.term": nctId, pageSize: "50" })
  const resp = await fetch(`${baseUrl}?${params.toString()}`)
  if (!resp.ok) throw new Error(`Failed to fetch study ${nctId}: ${resp.status}`)
  const data = await resp.json()
  const studies: any[] = data?.studies ?? []
  const found = studies.find((s) => s?.protocolSection?.identificationModule?.nctId === nctId)
  if (!found) return null
  return flattenStudyTunisia(found)
}

export const tunisiaStates = [
  "Tunis",
  "Sousse",
  "Sfax",
  "Kairouan",
  "Gabes",
  "Monastir",
  "Bizerte",
  "Ariana",
  "Beja",
  "Jendouba",
  "Kasserine",
  "Kebili",
  "Mahdia",
  "Manouba",
  "Medenine",
  "Nabeul",
  "Sidi Bouzid",
  "Siliana",
  "Tataouine",
  "Tozeur",
  "Zaghouan",
  "Gafsa",
  "Kef",
  "Ben Arous",
] as const

export type TunisiaState = (typeof tunisiaStates)[number]

const specialCityMap: Record<string, TunisiaState> = {
  "Many Locations": "Tunis",
  "Multiple Locations": "Tunis",
  "La Marsa": "Tunis",
  Aryanah: "Ariana",
  "Bab Saadoun": "Tunis",
  Montfleury: "Tunis",
  Mégrine: "Ben Arous",
}

function normalize(text?: string): string {
  if (!text) return ""
  const nfkd = text.normalize("NFD")
  return nfkd
    .split("")
    .filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x036f)
    .join("")
    .toLowerCase()
}

export function flattenStudyTunisia(study: any): FlatTrial {
  const flat: FlatTrial = {
    phases: [],
    cities: [],
    states: [],
  }
  const proto = study?.protocolSection ?? {}

  // Identification
  const idmod = proto.identificationModule ?? {}
  flat.nctId = idmod.nctId
  flat.orgStudyId = idmod.orgStudyIdInfo?.id
  flat.organization = idmod.organization?.fullName
  flat.briefTitle = idmod.briefTitle
  flat.officialTitle = idmod.officialTitle

  // Status
  const status = proto.statusModule ?? {}
  flat.overallStatus = status.overallStatus
  flat.startDate = status.startDateStruct?.date
  flat.completionDate = status.completionDateStruct?.date

  // Sponsor
  const sponsor = proto.sponsorCollaboratorsModule ?? {}
  flat.leadSponsor = sponsor.leadSponsor?.name
  flat.responsibleParty = sponsor.responsibleParty?.investigatorFullName

  // Oversight
  const oversight = proto.oversightModule ?? {}
  flat.fdaRegDrug = oversight.isFdaRegulatedDrug
  flat.fdaRegDevice = oversight.isFdaRegulatedDevice

  // Description
  const desc = proto.descriptionModule ?? {}
  flat.briefSummary = desc.briefSummary
  flat.detailedDescription = desc.detailedDescription

  // Conditions
  const cond = proto.conditionsModule ?? {}
  flat.conditions = cond.conditions ?? []

  // Design
  const design = proto.designModule ?? {}
  flat.studyType = design.studyType
  flat.enrollment = design.enrollmentInfo?.count

  const phases: string[] | undefined = design.phases
  if (phases && phases.length) {
    // Preserve API uppercase labels as in example output
    flat.phases = phases
  } else {
    flat.phases = ["N/A"]
  }

  // Outcomes
  const outcomes = proto.outcomesModule ?? {}
  if (outcomes.primaryOutcomes && outcomes.primaryOutcomes.length) {
    flat.primaryOutcome = outcomes.primaryOutcomes[0].measure
  }

  // Eligibility
  const elig = proto.eligibilityModule ?? {}
  flat.minAge = elig.minimumAge
  flat.sex = elig.sex
  flat.criteria = elig.eligibilityCriteria

  // Locations — capture all cities and states in Tunisia
  const locmod = proto.contactsLocationsModule ?? {}
  const cities: string[] = []
  const states: string[] = []
  for (const loc of locmod.locations ?? []) {
    if (loc.country === "Tunisia") {
      if (loc.city) cities.push(loc.city)
      if (loc.state) states.push(loc.state)
    }
  }
  flat.cities = cities
  flat.states = states

  return flat
}

export async function fetchAllTunisiaStudies(): Promise<FlatTrial[]> {
  const baseUrl = "https://clinicaltrials.gov/api/v2/studies"
  const params = new URLSearchParams({ "query.locn": "Tunisia", pageSize: "1000" })
  const all: FlatTrial[] = []
  let next: string | undefined

  while (true) {
    if (next) params.set("pageToken", next)
    else params.delete("pageToken")

    const resp = await fetch(`${baseUrl}?${params.toString()}`)
    if (!resp.ok) throw new Error(`Failed to fetch studies: ${resp.status}`)
    const data = await resp.json()
    const studies: any[] = data?.studies ?? []

    for (const s of studies) {
      const flat = flattenStudyTunisia(s)
      if (flat.cities && flat.cities.length) {
        all.push(flat)
      }
    }

    next = data?.nextPageToken
    if (!next) break
  }

  return all
}

export function trialsPerState(trials: FlatTrial[]): {
  stateTrials: Record<TunisiaState, FlatTrial[]>
  unmatched: FlatTrial[]
} {
  const stateTrials = Object.fromEntries(tunisiaStates.map((s) => [s, [] as FlatTrial[]])) as Record<TunisiaState, FlatTrial[]>
  const unmatched: FlatTrial[] = []

  for (const t of trials) {
    const cities = t.cities ?? []
    const statesField = t.states ?? []
    const foundStates = new Set<TunisiaState>()

    // Special city mapping
    for (const city of cities) {
      const mapped = specialCityMap[city as keyof typeof specialCityMap]
      if (mapped) foundStates.add(mapped)
    }

    for (const state of tunisiaStates) {
      const normState = normalize(state)
      for (const city of cities) {
        if (normalize(city).includes(normState)) {
          foundStates.add(state)
        }
      }
    }

    for (const state of tunisiaStates) {
      if (foundStates.has(state)) continue
      const normState = normalize(state)
      for (const s of statesField) {
        if (normalize(s).includes(normState)) {
          foundStates.add(state)
        }
      }
    }

    if (foundStates.size === 0) unmatched.push(t)
    for (const s of foundStates) stateTrials[s].push(t)
  }

  return { stateTrials, unmatched }
}

export function trialsPerStatePhase(trials: FlatTrial[]): {
  summary: Record<TunisiaState, Record<string, number>>
  unmatched: FlatTrial[]
} {
  const summary = Object.fromEntries(tunisiaStates.map((s) => [s, {} as Record<string, number>])) as Record<
    TunisiaState,
    Record<string, number>
  >
  const unmatched: FlatTrial[] = []

  for (const t of trials) {
    const cities = t.cities ?? []
    const phases = t.phases && t.phases.length ? t.phases : ["N/A"]
    const found = new Set<TunisiaState>()

    for (const city of cities) {
      const mapped = specialCityMap[city as keyof typeof specialCityMap]
      if (mapped) found.add(mapped)
    }

    for (const city of cities) {
      for (const state of tunisiaStates) {
        if (normalize(city).includes(normalize(state))) {
          found.add(state)
        }
      }
    }

    if (found.size === 0) unmatched.push(t)

    for (const state of found) {
      for (const ph of phases) {
        summary[state][ph] = (summary[state][ph] ?? 0) + 1
      }
    }
  }

  return { summary, unmatched }
}
