import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api/client'
import type { ApiEnvelope } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'

type RefundItem = {
  id: number
  trade_no: string
  amount: number
  reason: string
  status: number
  status_name: string
  admin_note: string | null
  created_at: number
  user?: { email: string }
  order?: { plan?: { name?: string }; trade_no?: string }
}

const statusVariant: Record<number, 'warning' | 'success' | 'destructive'> = {
  0: 'warning',
  1: 'success',
  2: 'destructive',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const r = 'response' in error ? (error as any).response?.data?.message : undefined
    if (typeof r === 'string' && r.trim()) return r
    const m = 'message' in error ? (error as any).message : undefined
    if (typeof m === 'string' && m.trim()) return m
  }
  return fallback
}

export function AdminRefundsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<number | null>(0)
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const { data: refunds, isLoading, error } = useQuery<RefundItem[]>({
    queryKey: ['admin-refunds', filter],
    queryFn: async () => {
      const params = filter !== null ? `?status=${filter}` : ''
      const res = await apiClient.get<ApiEnvelope<RefundItem[]>>(`/api/v2/user/admin/refund/fetch${params}`)
      // Handle paginated response
      const data = res.data.data as any
      if (data?.data) return data.data as RefundItem[]
      if (Array.isArray(data)) return data
      return []
    },
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No refund selected')
      await apiClient.post('/api/v2/user/admin/refund/approve', { id: selectedId, admin_note: adminNote || undefined })
    },
    onSuccess: () => {
      toast.success('退款已批准')
      setDialogAction(null)
      setSelectedId(null)
      setAdminNote('')
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, '操作失败')),
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No refund selected')
      await apiClient.post('/api/v2/user/admin/refund/reject', { id: selectedId, admin_note: adminNote || '管理员拒绝' })
    },
    onSuccess: () => {
      toast.success('退款已拒绝')
      setDialogAction(null)
      setSelectedId(null)
      setAdminNote('')
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, '操作失败')),
  })

  return (
    <div className='space-y-8'>
      <PageHeader badge='管理' title='退款审批' />
      <div className='px-4 lg:px-6'>
        <div className='mb-4 flex gap-2'>
          {[0, 1, 2].map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              size='sm'
              className='rounded-full'
              onClick={() => setFilter(s)}
            >
              {s === 0 ? '待审核' : s === 1 ? '已退款' : '已拒绝'}
            </Button>
          ))}
          <Button variant='outline' size='sm' className='rounded-full' onClick={() => setFilter(null)}>全部</Button>
        </div>

        <Card className='border-slate-200/90 bg-white/96 shadow-lg dark:border-border/70 dark:bg-card'>
          <CardContent className='p-6'>
            {isLoading ? (
              <div className='rounded-3xl border p-8 text-center text-sm text-slate-500'>加载中...</div>
            ) : error ? (<div role='alert'>退款列表加载失败，请刷新重试。</div>) : !refunds?.length ? (
              <div className='rounded-3xl border border-dashed p-8 text-center text-sm text-slate-500'>暂无退款记录</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b'>
                      <th className='pb-3 text-left font-medium text-slate-500'>ID</th>
                      <th className='pb-3 text-left font-medium text-slate-500'>用户</th>
                      <th className='pb-3 text-left font-medium text-slate-500'>订单号</th>
                      <th className='pb-3 text-right font-medium text-slate-500'>金额</th>
                      <th className='pb-3 text-center font-medium text-slate-500'>状态</th>
                      <th className='pb-3 text-left font-medium text-slate-500'>原因</th>
                      <th className='pb-3 text-right font-medium text-slate-500'>时间</th>
                      <th className='pb-3 text-right font-medium text-slate-500'>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(refunds as RefundItem[]).map((r) => (
                      <tr key={r.id} className='border-b border-slate-100 hover:bg-slate-50/50'>
                        <td className='py-3 text-slate-500'>{r.id}</td>
                        <td className='py-3 text-slate-900'>{r.user?.email ?? '--'}</td>
                        <td className='py-3 font-mono text-xs text-slate-900'>{r.trade_no}</td>
                        <td className='py-3 text-right font-medium text-slate-900'>${(r.amount / 100).toFixed(2)}</td>
                        <td className='py-3 text-center'>
                          <Badge variant={statusVariant[r.status]} className='rounded-full'>{r.status_name}</Badge>
                        </td>
                        <td className='py-3 max-w-[150px] truncate text-slate-500' title={r.reason}>{r.reason}</td>
                        <td className='py-3 text-right text-slate-500'>{formatDateTime(r.created_at)}</td>
                        <td className='py-3 text-right'>
                          {r.status === 0 && (
                            <div className='flex gap-1 justify-end'>
                              <Button size='sm' variant='ghost' aria-label='批准退款' className='text-green-600' onClick={() => { setSelectedId(r.id); setDialogAction('approve'); }}>
                                <CheckCircle className='size-4' />
                              </Button>
                              <Button size='sm' variant='ghost' aria-label='拒绝退款' className='text-red-600' onClick={() => { setSelectedId(r.id); setDialogAction('reject'); setAdminNote(''); }}>
                                <XCircle className='size-4' />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve/Reject Dialog */}
      {dialogAction && selectedId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40' onClick={() => setDialogAction(null)}>
          <div className='w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-border dark:bg-card' onClick={(e) => e.stopPropagation()}>
            <h3 className='text-lg font-semibold text-slate-900 dark:text-foreground'>
              {dialogAction === 'approve' ? '确认批准退款' : '确认拒绝退款'}
            </h3>
            <p className='mt-2 text-sm text-slate-500 dark:text-muted-foreground'>
              {dialogAction === 'approve'
                ? '批准后系统将自动取消Stripe订阅并执行退款操作。'
                : '请填写拒绝原因。'}
            </p>
            <div className='mt-4 space-y-3'>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={dialogAction === 'approve' ? '备注（可选）' : '拒绝原因（必填）'}
                rows={3}
                className='rounded-2xl border-slate-200/80'
              />
              <div className='flex gap-3'>
                <Button
                  className='w-full rounded-full'
                  variant={dialogAction === 'approve' ? 'default' : 'destructive'}
                  onClick={() => dialogAction === 'approve' ? approveMutation.mutate() : rejectMutation.mutate()}
                  disabled={approveMutation.isPending || rejectMutation.isPending || (dialogAction === 'reject' && !adminNote.trim())}
                >
                  {dialogAction === 'approve' ? '确认退款' : '拒绝'}
                </Button>
                <Button variant='outline' className='w-full rounded-full' onClick={() => setDialogAction(null)}>取消</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
