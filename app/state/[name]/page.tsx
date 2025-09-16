"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  fetchAllTunisiaStudies,
  trialsPerState,
  type FlatTrial,
  type TunisiaState,
  tunisiaStates,
} from "@/lib/clinicaltrials"

export default function StatePage() {
  const params = useParams<{ name: string }>()
  const stateName = decodeURIComponent(params.name || "") as TunisiaState

  const [trials, setTrials] = useState<FlatTrial[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10

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

  const list = useMemo(() => {
    if (!trials || !stateName) return [] as FlatTrial[]
    const { stateTrials } = trialsPerState(trials)
    const l = stateTrials[stateName] || []
    return l
  }, [trials, stateName])

  const isValid = tunisiaStates.includes(stateName as TunisiaState)
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const start = (clampedPage - 1) * pageSize
  const paginated = list.slice(start, start + pageSize)

  const statusClasses = (s?: string) => {
    const st = (s || "").toUpperCase()
    if (st.includes("RECRUITING") && !st.includes("NOT")) return "bg-green-100 text-green-800 border-green-200"
    if (st === "ACTIVE_NOT_RECRUITING") return "bg-cyan-100 text-cyan-800 border-cyan-200"
    if (st === "COMPLETED" || st === "APPROVED_FOR_MARKETING") return "bg-blue-100 text-blue-800 border-blue-200"
    if (st === "NOT_YET_RECRUITING") return "bg-amber-100 text-amber-800 border-amber-200"
    if (st === "SUSPENDED") return "bg-orange-100 text-orange-800 border-orange-200"
    if (st === "TERMINATED" || st === "WITHDRAWN") return "bg-red-100 text-red-800 border-red-200"
    if (st === "AVAILABLE" || st === "NO_LONGER_AVAILABLE" || st === "TEMPORARILY_NOT_AVAILABLE") return "bg-violet-100 text-violet-800 border-violet-200"
    return "bg-neutral-100 text-neutral-800 border-neutral-200"
  }

  const statusBorder = (s?: string) => {
    const st = (s || "").toUpperCase()
    if (st.includes("RECRUITING") && !st.includes("NOT")) return "border-l-green-500"
    if (st === "ACTIVE_NOT_RECRUITING") return "border-l-cyan-500"
    if (st === "COMPLETED" || st === "APPROVED_FOR_MARKETING") return "border-l-blue-500"
    if (st === "NOT_YET_RECRUITING") return "border-l-amber-500"
    if (st === "SUSPENDED") return "border-l-orange-500"
    if (st === "TERMINATED" || st === "WITHDRAWN") return "border-l-red-500"
    if (st === "AVAILABLE" || st === "NO_LONGER_AVAILABLE" || st === "TEMPORARILY_NOT_AVAILABLE") return "border-l-violet-500"
    return "border-l-neutral-400"
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trials in {isValid ? stateName : "Unknown State"}</h1>
            {isValid && <p className="text-muted-foreground">Total trials: {list.length}</p>}
          </div>
          <Link href="/">
            <Button variant="secondary">Back to map</Button>
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))}
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && isValid && (
          <div className="space-y-3">
            {list.length === 0 && <Card className="p-4">No trials found for this state.</Card>}
            {paginated.map((t) => (
              <Card
                key={`${t.nctId}-${(t.briefTitle || "").slice(0, 10)}`}
                className="relative p-0 overflow-hidden border hover:border-primary/60 transition-all shadow-sm hover:shadow-lg hover:-translate-y-[1px] bg-gradient-to-br from-card to-muted/40"
              >
                <div className={`border-l-4 ${statusBorder(t.overallStatus)} p-5`}> 
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-lg leading-tight">
                        {t.briefTitle || t.officialTitle || "Untitled Trial"}
                      </h3>
                      <div className="text-xs text-muted-foreground">NCT ID: {t.nctId || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">Sponsor: {t.leadSponsor || "N/A"}</div>
                      {/* badges section kept minimal; phases moved to details grid below */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm mt-2">
                        <div>Start: {t.startDate || "N/A"}</div>
                        <div>Status: {t.overallStatus || "N/A"}</div>
                        <div className="sm:col-span-2">
                          Phases: {t.phases && t.phases.length ? t.phases.join(", ") : "N/A"}
                        </div>
                        <div className="sm:col-span-2">
                          Conditions: {(t.conditions || []).slice(0, 4).join(", ") || "N/A"}
                          {t.conditions && t.conditions.length > 4 ? " …" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 self-center">
                      <Link href={`/trial/${encodeURIComponent(t.nctId || "")}`}>
                        <Button disabled={!t.nctId}>View details</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="pt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, clampedPage - 1)) }} />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={clampedPage === i + 1} onClick={(e) => { e.preventDefault(); setPage(i + 1) }}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, clampedPage + 1)) }} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}

        {!isValid && !loading && !error && (
          <Card className="p-4">Unknown state. Go back to the map.</Card>
        )}
      </div>
    </div>
  )
}

