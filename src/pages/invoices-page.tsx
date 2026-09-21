import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ReceiptText, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getInvoices } from '@/lib/api/services/stripe'
import { formatDateTime } from '@/lib/format'

type Invoice = {
  id: number
  invoice_no: string
  amount: number
  currency: string
  status: number
  status_name: string
  paid_at: number | null
  created_at: number
  order?: { plan?: { name?: string } }
  pdf_path?: string | null
}

const statusBadge: Record<number, 'success' | 'secondary' | 'destructive'> = {
  1: 'success',
  2: 'destructive',
  3: 'secondary',
}

function getStatusMeta(s: number) {
  if (s === 1) return { label: '已支付', variant: 'success' as const }
  if (s === 2) return { label: '已退款', variant: 'destructive' as const }
  return { label: '已取消', variant: 'secondary' as const }
}

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  })

  const filtered = useMemo(() => {
    if (!invoices) return []
    if (!search.trim()) return invoices
    const q = search.toLowerCase()
    return invoices.filter(
      (inv) =>
        inv.invoice_no.toLowerCase().includes(q) ||
        (inv.order?.plan?.name ?? '').toLowerCase().includes(q),
    )
  }, [invoices, search])

  if (isLoading) {
    return (
      <div className='space-y-8'>
        <PageHeader badge='账单' title='我的发票' />
        <div className='px-4 lg:px-6'>
          <div className='rounded-3xl border border-slate-200/80 bg-slate-50/85 p-8 text-center text-sm text-slate-500 dark:border-border/70 dark:bg-background/35'>
            加载中...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      <PageHeader badge='账单' title='我的发票' />
      <div className='px-4 lg:px-6'>
        <Card className='border-slate-200/90 bg-white/96 shadow-lg shadow-slate-200/60 dark:border-border/70 dark:bg-card dark:shadow-none'>
          <CardContent className='p-6'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='relative w-full max-w-sm'>
                <SearchIcon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  placeholder='搜索发票编号或套餐...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='rounded-2xl border-slate-200/80 bg-white/90 pl-9 shadow-sm dark:border-border/70 dark:bg-input/30'
                />
              </div>
              <div className='text-sm text-slate-500 dark:text-muted-foreground'>
                共 {filtered.length} 张发票
              </div>
            </div>

            {error ? (
              <div className='rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'>
                加载失败，请稍后重试
              </div>
            ) : filtered.length === 0 ? (
              <div className='rounded-3xl border border-dashed border-slate-200/80 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-border/70 dark:bg-background/20 dark:text-muted-foreground'>
                {search ? '未找到匹配的发票' : '暂无发票记录。完成订单后会自动生成发票。'}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-slate-200/80 dark:border-border/70'>
                      <th className='pb-3 text-left font-medium text-slate-500 dark:text-muted-foreground'>发票编号</th>
                      <th className='pb-3 text-left font-medium text-slate-500 dark:text-muted-foreground'>套餐</th>
                      <th className='pb-3 text-right font-medium text-slate-500 dark:text-muted-foreground'>金额</th>
                      <th className='pb-3 text-center font-medium text-slate-500 dark:text-muted-foreground'>状态</th>
                      <th className='pb-3 text-right font-medium text-slate-500 dark:text-muted-foreground'>日期</th>
                      <th className='pb-3 text-right font-medium text-slate-500 dark:text-muted-foreground'>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const meta = getStatusMeta(inv.status)
                      return (
                        <tr key={inv.id} className='border-b border-slate-100 dark:border-border/40 hover:bg-slate-50/50 dark:hover:bg-background/20'>
                          <td className='py-3 text-slate-900 dark:text-foreground'>{inv.invoice_no}</td>
                          <td className='py-3 text-slate-600 dark:text-muted-foreground'>{inv.order?.plan?.name ?? '--'}</td>
                          <td className='py-3 text-right font-medium text-slate-900 dark:text-foreground'>
                            ${(inv.amount / 100).toFixed(2)}
                          </td>
                          <td className='py-3 text-center'>
                            <Badge variant={meta.variant} className='rounded-full'>{meta.label}</Badge>
                          </td>
                          <td className='py-3 text-right text-slate-500 dark:text-muted-foreground'>
                            {inv.paid_at ? formatDateTime(inv.paid_at) : formatDateTime(inv.created_at)}
                          </td>
                          <td className='py-3 text-right'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='rounded-full'
                              onClick={() => {
                                window.open(`/api/v1/user/invoice/download/${inv.id}`, '_blank')
                              }}
                            >
                              <Download className='mr-1 size-4' />
                              PDF
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
