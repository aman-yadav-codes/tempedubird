"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"

type DebouncedSearchInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string
  onValueChange: (value: string) => void
  debounceMs?: number
}

export function DebouncedSearchInput({
  value,
  onValueChange,
  debounceMs = 500,
  ...props
}: DebouncedSearchInputProps) {
  const [state, setState] = useState(() => ({
    committedValue: value,
    draftValue: value,
  }))
  const onValueChangeRef = useRef(onValueChange)
  const draftValue = state.committedValue === value ? state.draftValue : value

  if (state.committedValue !== value) {
    setState({
      committedValue: value,
      draftValue: value,
    })
  }

  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  useEffect(() => {
    if (draftValue === value) return

    const timeout = window.setTimeout(() => {
      onValueChangeRef.current(draftValue)
    }, debounceMs)

    return () => window.clearTimeout(timeout)
  }, [debounceMs, draftValue, value])

  return (
    <Input
      {...props}
      value={draftValue}
      onChange={(event) => {
        const nextValue = event.target.value
        setState((current) => ({
          committedValue: current.committedValue,
          draftValue: nextValue,
        }))
      }}
    />
  )
}
