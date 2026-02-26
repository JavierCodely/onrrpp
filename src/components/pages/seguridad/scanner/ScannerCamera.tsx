import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScanLine } from 'lucide-react'

interface ScannerCameraProps {
  scanning: boolean
  hidden: boolean
  onStart: () => void
  onStop: () => void
}

export function ScannerCamera({ scanning, hidden, onStart, onStop }: ScannerCameraProps) {
  return (
    <Card className={hidden ? 'hidden' : ''}>
      <CardHeader>
        <CardTitle>Escáner de QR</CardTitle>
        <CardDescription>
          {!scanning
            ? 'Presiona el botón para iniciar el escáner'
            : 'Apunta la cámara al código QR del invitado'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!scanning ? (
          <Button
            onClick={onStart}
            className="w-full gap-2"
            size="lg"
          >
            <ScanLine className="h-5 w-5" />
            Iniciar Escáner
          </Button>
        ) : (
          <>
            <div
              id="reader"
              className="rounded-lg overflow-hidden border"
            ></div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4 animate-pulse" />
              <span>Buscando código QR...</span>
            </div>
            <Button
              onClick={onStop}
              variant="outline"
              className="w-full"
            >
              Detener Escáner
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
