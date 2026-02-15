import type { ImportError } from "@/services/yamlImporter"

interface ValidationErrorsProps {
  errors: ImportError[]
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null

  return (
    <div data-testid="validation-error-list" className="space-y-1">
      {errors.map((error, index) => (
        <div
          key={`${error.code}-${index}`}
          data-testid="validation-error-item"
          className="text-sm text-red-400"
        >
          <span className="font-medium">{error.code}</span>
          {error.path && <span className="text-red-400/70"> at {error.path}</span>}
          : {error.message}
        </div>
      ))}
    </div>
  )
}
