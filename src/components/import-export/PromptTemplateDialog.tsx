import { useState } from "react"
import template from "@/data/prompt-template.md?raw"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check } from "lucide-react"

interface PromptTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromptTemplateDialog({ open, onOpenChange }: PromptTemplateDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(template)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        if (import.meta.env.DEV) console.warn("Clipboard write failed — clipboard unavailable or permission denied")
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="prompt-template-dialog"
        className="max-w-2xl max-h-[80vh] flex flex-col"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>AI Prompt Template</DialogTitle>
            <Button
              data-testid="prompt-template-copy"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <pre className="whitespace-pre-wrap text-xs font-mono text-text-primary p-1">
            {template}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
