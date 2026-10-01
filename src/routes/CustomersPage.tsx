import { CustomerTable } from '@/components/CustomerTable';
import { FilterBar } from '@/components/Filters';

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Customers</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Account-level rows with health scoring and churn risk.</p>
        </div>
        <FilterBar compact />
      </div>
      <CustomerTable />
    </div>
  );
}