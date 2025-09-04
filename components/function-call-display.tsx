"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FunctionCall {
  name: string
  arguments: Record<string, any>
  result?: string
  status?: "pending" | "success" | "error"
  executionTime?: number
  error?: string
}

interface FunctionCallDisplayProps {
  functionCalls: FunctionCall[]
  className?: string
}

export function FunctionCallDisplay({ functionCalls, className }: FunctionCallDisplayProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedCalls)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCalls(newExpanded)
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case "error":
        return <XCircleIcon className="w-4 h-4 text-red-500" />
      case "pending":
        return <ClockIcon className="w-4 h-4 text-yellow-500 animate-pulse" />
      default:
        return <PlayIcon className="w-4 h-4 text-blue-500" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50"
      case "error":
        return "border-red-200 bg-red-50"
      case "pending":
        return "border-yellow-200 bg-yellow-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  if (!functionCalls || functionCalls.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <PlayIcon className="w-3 h-3" />
        Function Calls ({functionCalls.length})
      </div>

      {functionCalls.map((call, index) => (
        <Card key={index} className={cn("border", getStatusColor(call.status))}>
          <Collapsible open={expandedCalls.has(index)} onOpenChange={() => toggleExpanded(index)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(call.status)}
                    <CardTitle className="text-sm font-medium">{call.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {call.status || "executed"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.executionTime && (
                      <span className="text-xs text-muted-foreground">{call.executionTime}ms</span>
                    )}
                    {expandedCalls.has(index) ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {/* Arguments */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Arguments</h4>
                  <div className="bg-muted/50 rounded p-2 text-xs font-mono">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(call.arguments, null, 2)}</pre>
                  </div>
                </div>

                {/* Result */}
                {call.result && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Result</h4>
                    <div className="bg-muted/50 rounded p-2 text-xs">
                      <p className="whitespace-pre-wrap">{call.result}</p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {call.error && (
                  <div>
                    <h4 className="text-xs font-medium text-red-600 mb-1">Error</h4>
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                      <p className="whitespace-pre-wrap">{call.error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  )
}
