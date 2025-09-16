"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchStudyByNctId, type FlatTrial } from "@/lib/clinicaltrials"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function TrialDetailPage() {
  const params = useParams<{ nctId: string }>()
  const nctId = decodeURIComponent(params.nctId || "")

  const [trial, setTrial] = useState<FlatTrial | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError("")
        const data = await fetchStudyByNctId(nctId)
        setTrial(data)
      } catch (e: any) {
        setError(e?.message || "Failed to load trial")
      } finally {
        setLoading(false)
      }
    }
    if (nctId) run()
  }, [nctId])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Trial Details</h1>
          <Link href="/">
            <Button variant="secondary">Back to map</Button>
          </Link>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <Card className="p-6 space-y-4">
            {!trial ? (
              <p>Trial not found.</p>
            ) : (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{trial.briefTitle || trial.officialTitle || "Untitled Trial"}</h2>
                <div className="text-xs text-muted-foreground">NCT ID: {trial.nctId || "N/A"}</div>
                <div className="text-xs text-muted-foreground">Organization: {trial.organization || "N/A"}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {trial.phases?.length ? trial.phases.map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  )) : <Badge variant="outline">N/A</Badge>}
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Sponsor</div>
                    <div>{trial.leadSponsor || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Overall Status</div>
                    <div>{trial.overallStatus || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Start Date</div>
                    <div>{trial.startDate || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completion</div>
                    <div>{trial.completionDate || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Study Type</div>
                    <div>{trial.studyType || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Enrollment</div>
                    <div>{trial.enrollment ?? "N/A"}</div>
                  </div>
                </div>

                <Separator className="my-3" />
                <div>
                  <p className="font-medium">Conditions</p>
                  <p className="text-sm">{(trial.conditions || []).join(", ") || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium">Brief Summary</p>
                  <p className="text-sm whitespace-pre-wrap">{trial.briefSummary || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium">Detailed Description</p>
                  <p className="text-sm whitespace-pre-wrap">{trial.detailedDescription || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium">Eligibility</p>
                  <p className="text-sm">Minimum Age: {trial.minAge || "N/A"} • Sex: {trial.sex || "N/A"}</p>
                  <p className="text-sm whitespace-pre-wrap">{trial.criteria || ""}</p>
                </div>
                <div>
                  <p className="font-medium">Locations (Tunisia)</p>
                  <p className="text-sm">Cities: {trial.cities.join(", ") || "N/A"}</p>
                  <p className="text-sm">States: {trial.states.join(", ") || "N/A"}</p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
