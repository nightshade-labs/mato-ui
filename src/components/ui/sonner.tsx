import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      closeButton
      richColors
      theme="dark"
      toastOptions={{
        classNames: {
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton:
            'bg-muted text-muted-foreground hover:bg-muted/80',
          description: 'text-muted-foreground',
          toast:
            'border-white/10 bg-[color:var(--color-elevated)] text-foreground shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
