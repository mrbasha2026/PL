'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileSpreadsheet, Wallet, Users, TrendingUp, TrendingDown, Activity, Loader2, Calendar, Coins, ArrowLeft } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { View } from '@/components/system/SystemLayout';

interface Stats {
  companies: number;
  subsidiaries: number;
  pnlRecords: number;
  prepaidItems: number;
  totalPrepaid: number;
  totalMonthly: number;
  users: number;
  recentActivities: { id: string; type: string; message: string; createdAt: string; company?: { name: string; color: string } | null }[];
}

export function DashboardModule({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, prepaid, users] = await Promise.all([
          fetch('/api/companies').then(r => r.json()),
          fetch('/api/pnl-data').then(r => r.json()),
          fetch('/api/prepaid').then(r => r.json()),
          fetch('/api/users').then(r => r.json()).catch(() => ({ users: [] })),
        ]);
        const companies = c.companies || [];
        const prepaidItems = prepaid.items || [];
        setStats({
          companies: companies.length,
          subsidiaries: companies.filter((c: any) => c.type === 'SUBSIDIARY').length,
          pnlRecords: (p.data || []).length,
          prepaidItems: prepaidItems.length,
          totalPrepaid: prepaidItems.reduce((s: number, i: any) => s + i.amount, 0),
          totalMonthly: prepaidItems.reduce((s: number, i: any) => s + i.monthlyAmount, 0),
          users: (users.users || []).length,
          recentActivities: [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const cards = [
    { label: 'الشركات', value: stats.companies, sub: `${stats.subsidiaries} فرعية`, icon: Building2, color: '#4CAF50', view: 'companies' as View },
    { label: 'سجلات P&L', value: stats.pnlRecords, sub: 'فترة مالية', icon: FileSpreadsheet, color: '#0D9488', view: 'pnl-data' as View },
    { label: 'المصروفات المقدمة', value: stats.prepaidItems, sub: `${stats.totalMonthly.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} شهرياً`, icon: Wallet, color: '#D97706', view: 'prepaid' as View },
    { label: 'المستخدمون', value: stats.users, sub: 'مستخدم نشط', icon: Users, color: '#7C3AED', view: 'users' as View },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">لوحة المعلومات</h2>
          <p className="text-sm text-muted-foreground mt-1">نظرة عامة على النظام</p>
        </div>
        <PageActions hideExcel hidePrint />
      </div>

      {/* Hero */}
      <Card className="border-2 border-[#4CAF50]/30 overflow-hidden">
        <CardContent className="p-0">
          <div className="brand-gradient p-6 text-white relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 90% 10%, white 0%, transparent 30%)'
            }} />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-3">
                  <Image src="/logo.png" alt="Dealz Tree" width={56} height={56} className="rounded-xl" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">مرحباً بك في Dealz Tree</h3>
                  <p className="text-white/80 text-sm">نظام الإدارة المالية المتكامل — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs text-white/70">إجمالي المصروفات المقدمة</div>
                <div className="text-3xl font-bold">{stats.totalPrepaid.toLocaleString('ar-SA')}</div>
                <div className="text-xs text-white/70">{stats.totalMonthly.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} شهرياً</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate(card.view)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">{card.value}</div>
              <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-[#4CAF50]" /> النشاطات الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              النشاطات الأخيرة ستظهر هنا
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#4CAF50]" /> روابط سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button onClick={() => onNavigate('pnl-data')} className="w-full text-right p-2 rounded-lg hover:bg-[#4CAF50]/5 flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-[#4CAF50]" /> رفع بيانات P&L
            </button>
            <button onClick={() => onNavigate('prepaid')} className="w-full text-right p-2 rounded-lg hover:bg-[#4CAF50]/5 flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-[#D97706]" /> إضافة مصروف مقدم
            </button>
            <button onClick={() => onNavigate('reports')} className="w-full text-right p-2 rounded-lg hover:bg-[#4CAF50]/5 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-[#0D9488]" /> عرض التقارير
            </button>
            <button onClick={() => onNavigate('companies')} className="w-full text-right p-2 rounded-lg hover:bg-[#4CAF50]/5 flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-[#7C3AED]" /> إدارة الشركات
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
