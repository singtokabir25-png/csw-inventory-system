'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ConsignedItem {
  id: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unit: string;
  depositedDate: string;
  expiryDate: string;
  remainingDays: number;
  status: 'active' | 'expiring' | 'expired';
}

export default function ConsignorPortalPage() {
  const params = useParams();
  const token = params?.token;

  // Mock data สำหรับตัวอย่างหน้าตา UI (สามารถเชื่อมต่อ Supabase ตาม token จริงภายหลัง)
  const [loading, setLoading] = useState(false);
  const [consignorName, setConsignorName] = useState('คุณสมชาย ใจดี');
  const [items, setItems] = useState<ConsignedItem[]>([
    {
      id: '1',
      name: 'กระเป๋าหนังแท้ รุ่น Limited Edition',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500',
      quantity: 12,
      unit: 'ใบ',
      depositedDate: '15 ม.ค. 2026',
      expiryDate: '15 มิ.ย. 2026',
      remainingDays: 45,
      status: 'active',
    },
    {
      id: '2',
      name: 'สกิน케어 เซรั่มบำรุงผิวหน้า',
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      quantity: 50,
      unit: 'ขวด',
      depositedDate: '1 ก.พ. 2026',
      expiryDate: '1 เม.ย. 2026',
      remainingDays: 8,
      status: 'expiring',
    },
    {
      id: '3',
      name: 'นาฬิกาข้อมือ Smart Watch',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      quantity: 5,
      unit: 'เรือน',
      depositedDate: '10 ธ.ค. 2025',
      expiryDate: '10 มี.ค. 2026',
      remainingDays: 0,
      status: 'expired',
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-6 shadow-xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-3 border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ระบบตรวจสอบสินค้าฝาก (Public Storage Portal)
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              สวัสดีคุณ, {consignorName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              ตรวจสอบรายการสินค้า จำนวนคงเหลือ และระยะเวลาฝากฝากฝากของคุณได้ตลอด 24 ชม.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 text-right">
            <span className="text-xs text-slate-300 block">รหัสอ้างอิงผู้ฝาก</span>
            <span className="font-mono text-indigo-300 font-semibold text-sm">#CON-{String(token || 'DEMO').slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 -mt-8 pb-16">
        
        {/* Quick Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">สินค้าทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{items.length} <span className="text-sm font-normal text-slate-500">รายการ</span></h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">📦</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ใกล้หมดอายุ (&lt; 15 วัน)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {items.filter(i => i.remainingDays <= 15 && i.remainingDays > 0).length} <span className="text-sm font-normal text-slate-500">รายการ</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">⏳</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">หมดอายุแล้ว</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {items.filter(i => i.remainingDays === 0).length} <span className="text-sm font-normal text-slate-500">รายการ</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">⚠️</div>
          </div>
        </div>

        {/* Item List Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-lg">รายการสินค้าฝากของคุณ</h2>
            <span className="text-xs text-slate-400">* อัปเดตข้อมูลแบบเรียลไทม์</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              // กำหนดสีตามสถานะวันคงเหลือ
              let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
              let textStatus = `เหลือเวลาอีก ${item.remainingDays} วัน`;
              
              if (item.remainingDays === 0) {
                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                textStatus = "หมดอายุการฝากแล้ว";
              } else if (item.remainingDays <= 15) {
                badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                textStatus = `ใกล้หมดอายุ (เหลือ ${item.remainingDays} วัน)`;
              }

              return (
                <div key={item.id} className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Image & Details */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-base">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        <span>วันที่ฝาก: <strong className="text-slate-700">{item.depositedDate}</strong></span>
                        <span>•</span>
                        <span>วันหมดอายุ: <strong className="text-slate-700">{item.expiryDate}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Status Badge */}
                  <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block sm:hidden">จำนวนคงเหลือ</span>
                      <span className="text-lg font-bold text-slate-900">{item.quantity.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                    </div>

                    <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${badgeStyle} flex items-center gap-1.5`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {textStatus}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          หากต้องการต่ออายุสัญญาฝากสินค้าหรือเบิกสินค้าออก กรุณาติดต่อเจ้าหน้าที่ผ่านช่องทาง chocksuwit7893csw@gmail.com
        </div>

      </main>
    </div>
  );
}