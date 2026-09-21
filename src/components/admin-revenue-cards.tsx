import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
type Revenue = { mrr_cents: number; active_subscribers: number; new_subscriptions_this_month: number; total_paid_users: number };
export function AdminRevenueCards() {
 const query = useQuery({queryKey: ['admin-revenue'], queryFn: async () => (await apiClient.get<{data:Revenue}>('/api/v2/user/admin/revenue-stats')).data.data});
 if (query.isPending) return <p className="px-6">收入统计加载中…</p>;
 if (query.error || !query.data) return <p role="alert" className="px-6">收入统计加载失败，请刷新重试。</p>;
 const d=query.data;
 return <section aria-label="收入仪表盘" className="px-4 lg:px-6"><h2 className="mb-3 text-lg font-semibold">收入仪表盘</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
 ['月度经常性收入（MRR）',formatCurrency(d.mrr_cents)],['活跃订阅用户',d.active_subscribers],['本月新订阅',d.new_subscriptions_this_month],['累计付费用户',d.total_paid_users]
 ].map(([label,value])=><div key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div></section>;
}
