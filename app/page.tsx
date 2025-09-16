"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Tunisia from "@svg-maps/tunisia"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchAllTunisiaStudies,
  trialsPerState,
  trialsPerStatePhase,
  tunisiaStates,
  type FlatTrial,
  type TunisiaState,
} from "@/lib/clinicaltrials"

export default function TunisiaMapPage() {
  const [selectedState, setSelectedState] = useState<TunisiaState | "">("")
  const [trials, setTrials] = useState<FlatTrial[] | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  // Helpers to map SVG names to our 24 official governorates
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s*\d+$/, "")
      .trim()

  const alias: Record<string, TunisiaState> = {
    // spelling/locale variants
    "le kef": "Kef",
    "el kef": "Kef",
    aryanah: "Ariana",
  }

  const toState = (name: string): TunisiaState | null => {
    const n = normalize(name)
    if (alias[n]) return alias[n]
    // exact normalized match against official list
    for (const st of tunisiaStates) {
      if (normalize(st) === n) return st
    }
    return null
  }

  const mergedLocations = useMemo(() => {
    const locationGroups: { [key: string]: any[] } = {}

    Tunisia.locations.forEach((location) => {
      // Map each SVG location to an official governorate name
      const state = toState(location.name)
      if (!state) return // skip unknown fragments
      const groupName = state

      if (!locationGroups[groupName]) {
        locationGroups[groupName] = []
      }
      locationGroups[groupName].push(location)
    })

    return locationGroups
  }, [])

  const handleStateClick = (groupName: string) => {
    if (selectedState === groupName) {
      setSelectedState("")
    } else {
      // cast to TunisiaState if valid
      const name = groupName as TunisiaState
      setSelectedState(name)
    }
  }

  const resetSelection = () => {
    setSelectedState("")
  }

  // Fetch trials on mount
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError("")
        const data = await fetchAllTunisiaStudies()
        setTrials(data)
      } catch (e: any) {
        setError(e?.message || "Failed to load trials")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const counts = useMemo(() => {
    if (!trials) return { perStateCounts: {} as Record<string, number>, perStatePhase: {} as Record<string, any> }
    const { stateTrials } = trialsPerState(trials)
    const { summary } = trialsPerStatePhase(trials)
    const perStateCounts = Object.fromEntries(
      Object.entries(stateTrials).map(([s, arr]) => [s, (arr as FlatTrial[]).length])
    ) as Record<string, number>
    return { perStateCounts, perStatePhase: summary }
  }, [trials])

  const totalNationwide = trials?.length ?? 0

  // Allowed trial overallStatus values to display
  const allowedStatuses = [
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "ENROLLING_BY_INVITATION",
    "NOT_YET_RECRUITING",
    "RECRUITING",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
    "AVAILABLE",
    "NO_LONGER_AVAILABLE",
    "TEMPORARILY_NOT_AVAILABLE",
    "APPROVED_FOR_MARKETING",
    "WITHHELD",
    "UNKNOWN",
  ] as const

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!trials) return counts
    for (const t of trials) {
      const st = (t.overallStatus || "").toString().toUpperCase()
      if (!st || !allowedStatuses.includes(st as any)) continue
      counts[st] = (counts[st] ?? 0) + 1
    }
    return counts
  }, [trials])

  // Coloring: 0 -> gray, >0 -> same blue for all
  const colorForCount = (count: number) => {
    return count > 0 ? "#3b82f6" : "#e5e7eb"
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Tunisia Clinical Trials Map</h1>
          <p className="text-muted-foreground">Click a governorate on the map to see trial counts and phases.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 lg:col-span-8">
            <div className="border border-border rounded-lg p-4 bg-card w-full">
              {/* Selected state compact panel (top-left, above map) */}
              {!loading && !error && selectedState && (
                <div className="mb-4 inline-flex flex-wrap items-center gap-3 rounded-md bg-muted/60 px-3 py-2">
                  <span className="text-2xl font-bold">{selectedState}</span>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Total: {counts.perStateCounts[selectedState] ?? 0}
                  </Badge>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries((counts.perStatePhase as any)[selectedState] || {}).map(([phase, cnt]) => (
                      <Badge key={phase} variant="outline" className="text-xs px-3 py-1">
                        {phase}: {cnt as number}
                      </Badge>
                    ))}
                  </div>
                  {(counts.perStateCounts[selectedState] ?? 0) > 0 && (
                    <Link href={`/state/${encodeURIComponent(selectedState)}`}>
                      <Button>Browse Trials</Button>
                    </Link>
                  )}
                </div>
              )}
              <svg
                width="100%"
                height="760"
                viewBox={Tunisia.viewBox}
                className="w-full h-auto"
                style={{ maxHeight: "760px" }}
              >
                {Object.entries(mergedLocations).map(([stateName, locations]) => (
                  <g key={stateName}>
                    {locations.map((location, index) => (
                      <path
                        key={`${stateName}-${index}`}
                        d={location.path}
                        fill={selectedState === stateName ? "#ef4444" : colorForCount(counts.perStateCounts[stateName] ?? 0)}
                        stroke="#ffffff"
                        strokeWidth={selectedState === stateName ? 2 : 1}
                        className={`cursor-pointer transition-all duration-200 ${selectedState === stateName ? "state-glow" : "hover:opacity-80"}`}
                        onClick={() => handleStateClick(stateName)}
                      >
                        <title>{`${stateName}: ${counts.perStateCounts[stateName] ?? 0} trials`}</title>
                      </path>
                    ))}
                  </g>
                ))}
              </svg>
              <style jsx global>{`
                @keyframes red-glow {
                  0% { filter: drop-shadow(0 0 0px rgba(239,68,68,0.0)); }
                  50% { filter: drop-shadow(0 0 10px rgba(239,68,68,0.9)); }
                  100% { filter: drop-shadow(0 0 0px rgba(239,68,68,0.0)); }
                }
                .state-glow {
                  animation: red-glow 1.5s ease-in-out infinite;
                }
              `}</style>

              {/* End selected state compact panel */}
            </div>
            
          </div>

          <div className="md:col-span-5 lg:col-span-4 space-y-4">
            {/* Nationwide summary */}
            <Card className="p-4">
              <h2 className="text-xl font-semibold mb-1">Nationwide Summary</h2>
              <p className="text-sm text-muted-foreground mb-2">Live data across all Tunisia trials.</p>
              <Separator className="my-2" />
              {loading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              )}
              {error && <p className="text-red-600">{error}</p>}
              {!loading && !error && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Tunisia has {tunisiaStates.length} governorates.</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Total</Badge>
                      <span className="text-sm font-medium">{totalNationwide}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Overall status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusCounts)
                        .filter(([, n]) => (n ?? 0) > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([st, n]) => (
                          <Badge key={st} variant="outline" className="text-[11px]">
                            {st}: {n}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Selected state card removed (moved into map box) */}
          </div>
        </div>
      </div>
    </div>
  )
}

