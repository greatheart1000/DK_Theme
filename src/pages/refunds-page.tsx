import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from "lucide-react"
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getRefunds, requestRefund } from '@/lib/api/services/stripe'
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
  order?: { plan?: { name?: string }; trade_no?: string }
}

const statusBadge: Record<number, 'warning' | 'success' | 'destructive'> = {
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

export function RefundsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tradeNo, setTradeNo] = useState('')
  const [reason, setReason] = useState('')

  const { data: refunds, isLoading } = useQuery({
    queryKey: ['refunds'],
    queryFn: getRefunds,
  })

  const requestMutation = useMutation({
    mutationFn: () => requestRefund(tradeNo, reason),
    onSuccess: () => {
      toast.success('退款申请已提交，等待管理员审核')
      setDialogOpen(false)
      setTradeNo('')
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, '提交失败')),
  })

  return (
    <div className='space-y-8'>
      <PageHeader badge='账单' title='退款申请' />
      <div className='px-4 lg:px-6'>
        <div className='mb-4 flex justify-end'>
          <Button className='rounded-full' onClick={() => setDialogOpen(true)}>
            <RotateCcw className='mr-2 size-4' />
            申请退款
          </Button>
        </div>

        <Card className='border-slate-200/90 bg-white/96 shadow-lg shadow-slate-200/60 dark:border-border/70 dark:bg-card dark:shadow-none'>
          <CardContent className='p-6'>
            {isLoading ? (
              <div className='rounded-3xl border border-slate-200/80 bg-slate-50/85 p-8 text-center text-sm text-slate-500'>加载中...</div>
            ) : !refunds?.length ? (
              <div className='rounded-3xl border border-dashed border-slate-200/80 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-border/70 dark:bg-background/20 dark:text-muted-foreground'>
                暂无退款记录
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-slate-200/80 dark:border-border/70'>
                      <th className='pb-3 text-left font-medium text-slate-500'>订单号</th>
                      <th className='pb-3 text-left font-medium text-slate-500'>套餐</th>
                      <th className='pb-3 text-right font-medium text-slate-500'>金额</th>
                      <th className='pb-3 text-center font-medium text-slate-500'>状态</th>
                      <th className='pb-3 text-left font-medium text-slate-500'>原因</th>
                      <th className='pb-3 text-right font-medium text-slate-500'>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(refunds as RefundItem[]).map((r) => (
                      <tr key={r.id} className='border-b border-slate-100 dark:border-border/40 hover:bg-slate-50/50 dark:hover:bg-background/20'>
                        <td className='py-3 font-mono text-xs text-slate-900'>{r.trade_no}</td>
                        <td className='py-3 text-slate-600'>{r.order?.plan?.name ?? '--'}</td>
                        <td className='py-3 text-right font-medium text-slate-900'>${(r.amount / 100).toFixed(2)}</td>
                        <td className='py-3 text-center'>
                          <Badge variant={statusBadge[r.status]} className='rounded-full'>{r.status_name}</Badge>
                        </td>
                        <td className='py-3 max-w-[200px] truncate text-slate-500' title={r.reason}>{r.reason}</td>
                        <td className='py-3 text-right text-slate-500'>{formatDateTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='border-slate-200/90 bg-white/96 shadow-2xl shadow-slate-200/70 dark:border-border dark:bg-card dark:shadow-black/30'>
          <DialogHeader>
            <DialogTitle>申请退款</DialogTitle>
            <DialogDescription>提交退款申请后，管理员将在审核后处理。</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>订单号</Label>
              <Input
                value={tradeNo}
                onChange={(e) => setTradeNo(e.target.value)}
                placeholder='输入已完成的订单号'
                className='rounded-2xl border-slate-200/80 bg-white/90 shadow-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label>退款原因</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='请描述退款原因'
                rows={4}
                className='rounded-2xl border-slate-200/80 bg-white/90 shadow-sm'
              />
            </div>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button className='w-full sm:w-auto' onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending || !tradeNo || !reason}>
                {requestMutation.isPending ? '提交中...' : '提交申请'}
              </Button>
              <Button variant='outline' className='w-full bg-white/90 sm:w-auto dark:bg-transparent' onClick={() => setDialogOpen(false)}>取消</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
