import { useDashboardData } from './dashboard/useDashboardData'
import { DashboardFilters } from './dashboard/DashboardFilters'
import { EmptyEventState } from './dashboard/EmptyEventState'
import { KPICards } from './dashboard/KPICards'
import { MesasKPICards } from './dashboard/MesasKPICards'
import { GenderKPICards } from './dashboard/GenderKPICards'
import { AverageAgeCard } from './dashboard/AverageAgeCard'
import { HourlyIngressChart } from './dashboard/HourlyIngressChart'
import { TopLocalitiesInvitadosChart } from './dashboard/TopLocalitiesInvitadosChart'
import { TopLocalitiesIngresosChart } from './dashboard/TopLocalitiesIngresosChart'
import { CountryDistributionChart } from './dashboard/CountryDistributionChart'
import { GenderDistributionCharts } from './dashboard/GenderDistributionCharts'
import { TopRRPPsInvitadosChart } from './dashboard/TopRRPPsInvitadosChart'
import { TopRRPPsIngresosChart } from './dashboard/TopRRPPsIngresosChart'
import { TopRRPPsMesasChart } from './dashboard/TopRRPPsMesasChart'
import { DailySalesByDayChart } from './dashboard/DailySalesByDayChart'

export function DashboardPage() {
  const {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    hasEventoSelected,
    eventos,
    rrpps,
    paises,
    provincias,
    departamentos,
    loadProvincias,
    stats,
    loading,
    hourlyData,
    locationData,
    topLocalidadesInvitados,
    paisStats,
    rrppData,
    rrppIngresoData,
    rrppMesaData,
    dailySalesByDay,
    selectedLocalidad,
    rrppsByLocalidad,
    handleLocalidadClick,
    clearLocalidadSelection,
    selectedLocalidadIngreso,
    rrppsByLocalidadIngreso,
    handleLocalidadIngresoClick,
    clearLocalidadIngresoSelection,
    selectedRRPP,
    setSelectedRRPP,
    selectedRRPPIngreso,
    setSelectedRRPPIngreso,
    selectedRRPPMesa,
    setSelectedRRPPMesa,
  } = useDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics</h1>
        <p className="text-muted-foreground">
          {hasEventoSelected
            ? 'Análisis completo de eventos e invitados'
            : 'Selecciona un evento para ver las estadísticas'}
        </p>
      </div>

      <DashboardFilters
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        eventos={eventos}
        rrpps={rrpps}
        paises={paises}
        provincias={provincias}
        departamentos={departamentos}
        loadProvincias={loadProvincias}
      />

      {!hasEventoSelected && <EmptyEventState />}

      {hasEventoSelected && (
        <>
          <KPICards loading={loading} stats={stats} />

          {filters.eventoId && filters.eventoId !== 'ALL' && (
            <DailySalesByDayChart loading={loading} dailySalesByDay={dailySalesByDay} />
          )}

          {stats && stats.total_mesas > 0 && (
            <MesasKPICards loading={loading} stats={stats} />
          )}

          <GenderKPICards loading={loading} stats={stats} />

          <AverageAgeCard loading={loading} stats={stats} />

          <HourlyIngressChart loading={loading} hourlyData={hourlyData} />

          <TopLocalitiesInvitadosChart
            loading={loading}
            topLocalidadesInvitados={topLocalidadesInvitados}
            selectedLocalidad={selectedLocalidad}
            rrppsByLocalidad={rrppsByLocalidad}
            onLocalidadClick={handleLocalidadClick}
            onClearSelection={clearLocalidadSelection}
          />

          <TopLocalitiesIngresosChart
            loading={loading}
            locationData={locationData}
            selectedLocalidadIngreso={selectedLocalidadIngreso}
            rrppsByLocalidadIngreso={rrppsByLocalidadIngreso}
            onLocalidadIngresoClick={handleLocalidadIngresoClick}
            onClearIngresoSelection={clearLocalidadIngresoSelection}
          />

          {paisStats.length > 0 && (
            <CountryDistributionChart loading={loading} paisStats={paisStats} />
          )}

          <GenderDistributionCharts loading={loading} stats={stats} />

          <TopRRPPsInvitadosChart
            loading={loading}
            rrppData={rrppData}
            selectedRRPP={selectedRRPP}
            onRRPPClick={setSelectedRRPP}
          />

          <TopRRPPsIngresosChart
            loading={loading}
            rrppIngresoData={rrppIngresoData}
            selectedRRPPIngreso={selectedRRPPIngreso}
            onRRPPIngresoClick={setSelectedRRPPIngreso}
          />

          {rrppMesaData.length > 0 && (
            <TopRRPPsMesasChart
              loading={loading}
              rrppMesaData={rrppMesaData}
              selectedRRPPMesa={selectedRRPPMesa}
              onRRPPMesaClick={setSelectedRRPPMesa}
            />
          )}
        </>
      )}
    </div>
  )
}
