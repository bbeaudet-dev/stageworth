"use client";

import { Suspense } from "react";
import { AddShowModal } from "./AddShowModal";
import { AdminFilters } from "./AdminFilters";
import { AdminShowTable } from "./AdminShowTable";
import { StatCard } from "./AdminStatCards";
import { PropertyFocusTable } from "./PropertyFocusTable";
import { useAdminDashboard } from "./useAdminDashboard";

function AdminDashboardContent() {
  const {
    statusFilter, setStatusFilter,
    showRunning, setShowRunning,
    showUpcoming, setShowUpcoming,
    showClosed, setShowClosed,
    search, setSearch,
    focusField, setFocusField,
    onlyWithPending, setOnlyWithPending,
    sortBy, setSortBy,
    visibleCount, setVisibleCount,
    adminPathWithoutSearch,
    focusGroup,
    loading,
    rows,
    totalFiltered,
    hasMore,
    truncated,
    stats,
    listError,
    focusListRaw,
    focusEdit, setFocusEdit,
    focusBusy,
    focusEditRef,
    handleFocusAction,
    addShowModalOpen,
    newShowName, setNewShowName,
    newShowType, setNewShowType,
    newShowDataStatus, setNewShowDataStatus,
    setNewShowImage,
    addShowBusy,
    addShowError,
    imageInputKey,
    setAddShowSubmitIntent,
    handleAddMissingShow,
    openAddShowModal,
    closeAddShowModal,
  } = useAdminDashboard();

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
            <StatCard label="Unpublished" value={stats.shows.needsReview} className="border-amber-200 bg-amber-50" />
            <StatCard label="Partial" value={stats.shows.partial} className="border-blue-200 bg-blue-50" />
            <StatCard label="Complete" value={stats.shows.complete} className="border-green-200 bg-green-50" />
            <StatCard label="Pending Queue Items" value={stats.pendingQueueEntries} className="border-gray-200 bg-gray-50" />
          </div>
        )}

        {listError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-5 text-sm text-amber-950" role="alert">
            <p className="font-medium">Could not load the show list from Convex.</p>
            <p className="mt-2 text-amber-900/90 whitespace-pre-wrap">{listError.message}</p>
            <p className="mt-3 text-amber-900/90">
              This often happens if the website was deployed before the backend.
              From the repo root, deploy Convex so <code className="rounded bg-amber-100/80 px-1">listShowsForReview</code> matches the site (includes schedule filter arguments):{" "}
              <code className="rounded bg-amber-100/80 px-1">npx convex deploy</code>
            </p>
          </div>
        )}

        <AdminFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          showRunning={showRunning}
          setShowRunning={setShowRunning}
          showUpcoming={showUpcoming}
          setShowUpcoming={setShowUpcoming}
          showClosed={showClosed}
          setShowClosed={setShowClosed}
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          focusField={focusField}
          setFocusField={setFocusField}
          setFocusEdit={setFocusEdit}
          onlyWithPending={onlyWithPending}
          setOnlyWithPending={setOnlyWithPending}
          onAddShow={openAddShowModal}
        />

        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : listError && !focusField ? null : (
          <>
            {focusField && focusGroup ? (
              <PropertyFocusTable
                focusGroup={focusGroup}
                focusListRaw={focusListRaw}
                adminPathWithoutSearch={adminPathWithoutSearch}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                loading={loading}
                focusEdit={focusEdit}
                setFocusEdit={setFocusEdit}
                focusBusy={focusBusy}
                focusEditRef={focusEditRef}
                handleFocusAction={handleFocusAction}
              />
            ) : (
              <AdminShowTable
                rows={rows}
                totalFiltered={totalFiltered}
                truncated={truncated}
                hasMore={hasMore}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                adminPathWithoutSearch={adminPathWithoutSearch}
              />
            )}
          </>
        )}
      </div>

      <AddShowModal
        open={addShowModalOpen}
        busy={addShowBusy}
        error={addShowError}
        showName={newShowName}
        setShowName={setNewShowName}
        showType={newShowType}
        setShowType={setNewShowType}
        showDataStatus={newShowDataStatus}
        setShowDataStatus={setNewShowDataStatus}
        imageInputKey={imageInputKey}
        setShowImage={setNewShowImage}
        onSaveClick={() => setAddShowSubmitIntent("open")}
        onSaveExitClick={() => setAddShowSubmitIntent("exit")}
        onSubmit={handleAddMissingShow}
        onClose={closeAddShowModal}
      />
    </>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-5 text-sm text-gray-500">Loading...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
