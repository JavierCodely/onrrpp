import { Routes, Route, Navigate } from 'react-router-dom'
import { SeguridadLayout } from '@/components/organisms/SeguridadLayout'
import { ScannerPage } from '@/components/pages/seguridad/ScannerPage'
import { ConfiguracionPage } from '@/components/pages/ConfiguracionPage'

export function SeguridadDashboard() {
  return (
    <SeguridadLayout>
      <Routes>
        <Route index element={<ScannerPage />} />
        <Route path="tema" element={<ConfiguracionPage />} />
        <Route path="*" element={<Navigate to="/dashboard/seguridad" replace />} />
      </Routes>
    </SeguridadLayout>
  )
}
