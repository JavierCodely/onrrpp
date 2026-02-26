import { Routes, Route, Navigate } from 'react-router-dom'
import { BartenderLayout } from '@/components/organisms/BartenderLayout'
import { BartenderScannerPage } from '@/components/pages/bartender/BartenderScannerPage'
import { BartenderHistorialPage } from '@/components/pages/bartender/BartenderHistorialPage'

export function BartenderDashboard() {
  return (
    <BartenderLayout>
      <Routes>
        <Route index element={<Navigate to="/dashboard/bartender/scanner" replace />} />
        <Route path="scanner" element={<BartenderScannerPage />} />
        <Route path="historial" element={<BartenderHistorialPage />} />
        <Route path="*" element={<Navigate to="/dashboard/bartender/scanner" replace />} />
      </Routes>
    </BartenderLayout>
  )
}
