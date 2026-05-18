'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type MonthHistory = {
  month: number;
  year: number;
  totalPaid: number;
  totalPending: number;
  total: number;
};

const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export default function HistoricoPage() {
  const hoje = new Date();

  const [year, setYear] = useState(hoje.getFullYear());
  const [history, setHistory] = useState<MonthHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const money = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const fetchHistory = async () => {
    setLoading(true);

    try {
      const response = await api.get(`/bills/monthly-history?year=${year}`);
      setHistory(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [year]);

  const maxTotal = useMemo(() => {
    const values = history.map((item) => item.total);
    return Math.max(...values, 1);
  }, [history]);

  const totals = useMemo(() => {
    const total = history.reduce((sum, item) => sum + item.total, 0);

    return {
      total,
      average: total / 12,
    };
  }, [history]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Histórico mensal</h1>

              <p className="text-sm text-slate-500">
                Compare quanto foi gasto em cada mês
              </p>
            </div>

            <div className="flex gap-2">
              <select
                className="rounded-lg border p-2"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from(
                  { length: 10 },
                  (_, index) => hoje.getFullYear() - 3 + index,
                ).map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>

              <Link
                href="/"
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Voltar
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm text-slate-500">Total gasto no ano</p>

            <strong>{money(totals.total)}</strong>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="text-sm text-slate-500">Média mensal</p>

            <strong>{money(totals.average)}</strong>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold">
            Comparativo total gasto por mês
          </h2>

          {loading && (
            <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">
              Carregando histórico...
            </p>
          )}

          {!loading && (
            <div className="space-y-4">
              {history.map((item) => {
                const width = Math.max((item.total / maxTotal) * 100, 2);

                return (
                  <div
                    key={item.month}
                    className="rounded-2xl border p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {meses[item.month - 1]} / {item.year}
                        </h3>

                        <p className="text-sm text-slate-500">
                          Pago: {money(item.totalPaid)} • Pendente:{' '}
                          {money(item.totalPending)}
                        </p>
                      </div>

                      <strong className="text-lg">
                        {money(item.total)}
                      </strong>
                    </div>

                    <div className="h-5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}