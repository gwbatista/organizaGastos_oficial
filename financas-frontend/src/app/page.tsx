'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type Bill = {
  id: number;
  title: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  categoryId: number;
  month: number;
  year: number;
  groupId?: string | null;
  recurrenceType: 'single' | 'installment' | 'recurring' | 'custom';
  installmentNumber?: number | null;
  installmentTotal?: number | null;
};

type Category = {
  id: number;
  name: string;
  bills: Bill[];
};

type Summary = {
  totalPaid: number;
  totalPending: number;
  total: number;
  overdue: number;
  paidPercent: number;
  categories: {
    category: string;
    totalPaid: number;
    totalPending: number;
    total: number;
  }[];
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

export default function Home() {
  const hoje = new Date();

  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const [year, setYear] = useState(hoje.getFullYear());

  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [groupBills, setGroupBills] = useState<Bill[]>([]);
  const [groupModalTitle, setGroupModalTitle] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [recurrenceType, setRecurrenceType] = useState<
    'single' | 'installment' | 'recurring' | 'custom'
  >('single');

  const [installments, setInstallments] = useState('1');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>(
    'all',
  );

  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editScope, setEditScope] = useState<'single' | 'future' | 'all'>(
    'single',
  );

  const money = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const fetchData = async () => {
    const billsRes = await api.get(`/bills?month=${month}&year=${year}`);
    setCategories(billsRes.data);

    const summaryRes = await api.get(`/bills/summary?month=${month}&year=${year}`);
    setSummary(summaryRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  useEffect(() => {
    const savedIncome = localStorage.getItem(`monthlyIncome-${month}-${year}`);
    setMonthlyIncome(savedIncome || '');
  }, [month, year]);

  const filteredCategories = useMemo(() => {
    return categories.map((category) => {
      const bills = category.bills
        .filter((bill) => {
          const now = new Date();

          if (filter === 'pending') return bill.status === 'pending';
          if (filter === 'paid') return bill.status === 'paid';
          if (filter === 'overdue') {
            return bill.status === 'pending' && new Date(bill.dueDate) < now;
          }

          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );

      return {
        ...category,
        bills,
      };
    });
  }, [categories, filter]);

  const hasBills = filteredCategories.some((category) => category.bills.length > 0);

  const handleSaveIncome = () => {
    localStorage.setItem(`monthlyIncome-${month}-${year}`, monthlyIncome);
    alert('Saldo do mês salvo.');
  };

  const openGroupBills = async (bill: Bill) => {
    if (!bill.groupId) {
      alert('Essa conta não possui parcelas vinculadas.');
      return;
    }

    const response = await api.get(`/bills/group/${bill.groupId}`);

    setGroupBills(response.data);
    setGroupModalTitle(bill.title);
    setShowGroupModal(true);
  };

  const toggleStatus = async (bill: Bill) => {
    await api.patch(`/bills/${bill.id}/status`, {
      status: bill.status === 'paid' ? 'pending' : 'paid',
    });

    fetchData();
  };

  const handleCreateBill = async () => {
    if (!title || !amount || !dueDate || !categoryId) {
      alert('Preencha título, valor, vencimento e categoria.');
      return;
    }

    if (recurrenceType === 'custom' && selectedMonths.length === 0) {
      alert('Selecione ao menos um mês.');
      return;
    }

    if (
      (recurrenceType === 'installment' || recurrenceType === 'recurring') &&
      Number(installments) <= 0
    ) {
      alert('Informe a quantidade de meses/parcelas.');
      return;
    }

    await api.post('/bills', {
      title,
      amount: Number(amount),
      dueDate: new Date(dueDate).toISOString(),
      categoryId: Number(categoryId),
      recurrenceType,
      installments: Number(installments),
      year,
      months: selectedMonths,
    });

    setTitle('');
    setAmount('');
    setDueDate('');
    setCategoryId('');
    setRecurrenceType('single');
    setInstallments('1');
    setSelectedMonths([]);

    fetchData();
  };

  const openEdit = (bill: Bill) => {
    setEditBill(bill);
    setEditTitle(bill.title);
    setEditAmount(String(bill.amount));
    setEditDueDate(bill.dueDate.split('T')[0]);
    setEditCategoryId(String(bill.categoryId));
    setEditScope('single');
  };

  const handleUpdateBill = async () => {
    if (!editBill) return;

    if (!editTitle || !editAmount || !editDueDate || !editCategoryId) {
      alert('Preencha todos os campos.');
      return;
    }

    await api.patch(`/bills/${editBill.id}`, {
      title: editTitle,
      amount: Number(editAmount),
      dueDate: new Date(editDueDate).toISOString(),
      categoryId: Number(editCategoryId),
      updateScope: editScope,
    });

    setEditBill(null);
    fetchData();
  };

  const deleteBill = async (bill: Bill) => {
    let scope: 'single' | 'future' | 'all' = 'single';

    if (bill.groupId) {
      const option = window.prompt(
        'Digite:\n1 - Excluir somente esta conta\n2 - Excluir esta e os próximos meses\n3 - Excluir todas as contas vinculadas',
        '1',
      );

      if (option === '2') scope = 'future';
      if (option === '3') scope = 'all';

      if (!['1', '2', '3'].includes(option || '')) return;
    } else {
      if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    }

    await api.delete(`/bills/${bill.id}?scope=${scope}`);
    fetchData();
  };

  const duplicateBill = (bill: Bill) => {
    setTitle(bill.title);
    setAmount(String(bill.amount));
    setDueDate(bill.dueDate.split('T')[0]);
    setCategoryId(String(bill.categoryId));
    setRecurrenceType('single');
    setInstallments('1');
    setSelectedMonths([]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMonth = (monthNumber: number) => {
    setSelectedMonths((prev) =>
      prev.includes(monthNumber)
        ? prev.filter((item) => item !== monthNumber)
        : [...prev, monthNumber].sort((a, b) => a - b),
    );
  };

  const getInstallmentLabel = (bill: Bill) => {
    if (
      bill.recurrenceType === 'installment' &&
      bill.installmentNumber &&
      bill.installmentTotal
    ) {
      const faltam = bill.installmentTotal - bill.installmentNumber;
      return `Parcela ${bill.installmentNumber}/${bill.installmentTotal} • faltam ${faltam}`;
    }

    if (bill.recurrenceType === 'recurring') {
      return 'Recorrente mensal';
    }

    if (bill.recurrenceType === 'custom') {
      return 'Meses selecionados';
    }

    return 'Conta única';
  };

  const isOverdue = (bill: Bill) => {
    return bill.status === 'pending' && new Date(bill.dueDate) < new Date();
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Controle de Contas</h1>
              <p className="text-sm text-slate-500">
                {meses[month - 1]} de {year}
              </p>
            </div>

            <div className="flex gap-2">
              <select
                className="rounded-lg border p-2"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {meses.map((mes, index) => (
                  <option key={mes} value={index + 1}>
                    {mes}
                  </option>
                ))}
              </select>

              <select
                className="rounded-lg border p-2"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from(
                  { length: 15 },
                  (_, index) => hoje.getFullYear() - 2 + index,
                ).map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {summary && (
          <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">Pago</p>
              <strong className="text-green-600">
                {money(summary.totalPaid)}
              </strong>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">Pendente</p>
              <strong className="text-orange-600">
                {money(summary.totalPending)}
              </strong>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">Total</p>
              <strong>{money(summary.total)}</strong>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">Pago no mês</p>
              <strong>{summary.paidPercent}%</strong>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">Vencidas</p>
              <strong className="text-red-600">{summary.overdue}</strong>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold">Saldo disponível do mês</h2>
              <p className="text-sm text-slate-500">
                Informe quanto você recebeu no mês para calcular o que sobra depois das contas pendentes.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:w-80">
              <input
                className="rounded-lg border p-2"
                type="number"
                placeholder="Quanto recebi no mês"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
              />

              <button
                onClick={handleSaveIncome}
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Salvar saldo
              </button>
            </div>
          </div>

          {summary && monthlyIncome && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Recebido</p>
                <strong>{money(Number(monthlyIncome))}</strong>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Contas pendentes</p>
                <strong className="text-orange-600">
                  {money(summary.totalPending)}
                </strong>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-slate-500">Sobra prevista</p>
                <strong
                  className={
                    Number(monthlyIncome) - summary.totalPending >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {money(Number(monthlyIncome) - summary.totalPending)}
                </strong>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold">Adicionar Nova Conta</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded-lg border p-2"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="rounded-lg border p-2"
              placeholder="Valor"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <input
              className="rounded-lg border p-2"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <select
              className="rounded-lg border p-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg border p-2"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as any)}
            >
              <option value="single">Conta única</option>
              <option value="installment">Parcelada</option>
              <option value="recurring">Recorrente mensal</option>
              <option value="custom">Selecionar meses manualmente</option>
            </select>

            {(recurrenceType === 'installment' ||
              recurrenceType === 'recurring') && (
                <input
                  className="rounded-lg border p-2"
                  type="number"
                  min={1}
                  placeholder="Quantidade de meses/parcelas"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              )}
          </div>

          {recurrenceType === 'custom' && (
            <div className="mt-4 rounded-xl border p-3">
              <p className="mb-2 text-sm font-semibold">
                Selecione os meses de {year}
              </p>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {meses.map((mes, index) => {
                  const monthNumber = index + 1;
                  const checked = selectedMonths.includes(monthNumber);

                  return (
                    <label
                      key={mes}
                      className={`cursor-pointer rounded-lg border p-2 text-sm ${checked ? 'bg-slate-900 text-white' : 'bg-white'
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={checked}
                        onChange={() => toggleMonth(monthNumber)}
                      />
                      {mes}/{year}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateBill}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Adicionar
          </button>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold">Contas do mês</h2>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'pending', label: 'Pendentes' },
                { key: 'paid', label: 'Pagas' },
                { key: 'overdue', label: 'Vencidas' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as any)}
                  className={`rounded-lg border px-3 py-1 text-sm ${filter === item.key ? 'bg-slate-900 text-white' : 'bg-white'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {!hasBills && (
              <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                Nenhuma conta encontrada.
              </p>
            )}

            {filteredCategories.map((category) => {
              if (category.bills.length === 0) return null;

              const totalCategoria = category.bills.reduce(
                (sum, bill) => sum + bill.amount,
                0,
              );

              return (
                <div key={category.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{category.name}</h3>

                    <span className="text-sm font-semibold text-slate-600">
                      {money(totalCategoria)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {category.bills.map((bill) => (
                      <div
                        key={bill.id}
                        className={`rounded-xl border p-4 ${bill.status === 'paid'
                          ? 'border-green-300 bg-green-50'
                          : isOverdue(bill)
                            ? 'border-red-300 bg-red-50'
                            : 'bg-white'
                          }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold">{bill.title}</h3>

                              <span
                                className={`rounded-full px-2 py-1 text-xs ${bill.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                                  }`}
                              >
                                {bill.status === 'paid' ? 'Pago' : 'Pendente'}
                              </span>

                              {isOverdue(bill) && bill.status !== 'paid' && (
                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                  Vencida
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-slate-500">
                              Vence em{' '}
                              {new Date(bill.dueDate).toLocaleDateString('pt-BR')}{' '}
                              • {money(bill.amount)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getInstallmentLabel(bill)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleStatus(bill)}
                              className="rounded-lg border px-3 py-2 text-sm"
                            >
                              {bill.status === 'paid'
                                ? 'Marcar pendente'
                                : 'Marcar pago'}
                            </button>

                            <button
                              onClick={() => openEdit(bill)}
                              className="rounded-lg border px-3 py-2 text-sm"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => duplicateBill(bill)}
                              className="rounded-lg border px-3 py-2 text-sm"
                            >
                              Duplicar
                            </button>

                            {bill.groupId && (
                              <button
                                onClick={() => openGroupBills(bill)}
                                className="rounded-lg border px-3 py-2 text-sm"
                              >
                                Ver parcelas
                              </button>
                            )}

                            <button
                              onClick={() => deleteBill(bill)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {editBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-lg font-bold">Editar Conta</h2>

              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border p-2"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título"
                />

                <input
                  className="w-full rounded-lg border p-2"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Valor"
                />

                <input
                  className="w-full rounded-lg border p-2"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />

                <select
                  className="w-full rounded-lg border p-2"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {editBill.groupId && (
                  <select
                    className="w-full rounded-lg border p-2"
                    value={editScope}
                    onChange={(e) => setEditScope(e.target.value as any)}
                  >
                    <option value="single">Alterar somente esta conta</option>
                    <option value="future">Alterar esta e os próximos meses</option>
                    <option value="all">Alterar todas as contas vinculadas</option>
                  </select>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditBill(null)}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleUpdateBill}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Parcelas vinculadas</h2>
                  <p className="text-sm text-slate-500">{groupModalTitle}</p>
                </div>

                <button
                  onClick={() => setShowGroupModal(false)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Fechar
                </button>
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                {groupBills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`rounded-xl border p-4 ${bill.status === 'paid'
                        ? 'border-green-300 bg-green-50'
                        : isOverdue(bill)
                          ? 'border-red-300 bg-red-50'
                          : 'bg-white'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <strong>
                          {bill.installmentNumber && bill.installmentTotal
                            ? `Parcela ${bill.installmentNumber}/${bill.installmentTotal}`
                            : `${meses[bill.month - 1]}/${bill.year}`}
                        </strong>

                        <p className="text-sm text-slate-500">
                          Vence em {new Date(bill.dueDate).toLocaleDateString('pt-BR')} •{' '}
                          {money(bill.amount)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs ${bill.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {bill.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}