'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { Trash, CheckCircle, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// Cores para gráfico
const COLORS = ['#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#9C27B0'];

type Bill = {
  id: number;
  title: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  categoryId: number;
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
  categories: {
    category: string;
    totalPaid: number;
    totalPending: number;
    total: number;
  }[];
};

export default function Home() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  // Formulário nova conta
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Estados para edição
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  // Função para ordenar contas pela data de vencimento
  function sortBillsByDueDate(bills: Bill[]) {
    return [...bills].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }

  const fetchData = async () => {
    const billsRes = await api.get(`/bills?month=${month}&year=${year}`);
    setCategories(billsRes.data);

    const summaryRes = await api.get(`/bills/summary?month=${month}&year=${year}`);
    setSummary(summaryRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  // Marcar pago/pendente
  const toggleStatus = async (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid';
    await api.patch(`/bills/${bill.id}/status`, { status: newStatus });
    fetchData();
  };

  // Criar nova conta
  const handleCreateBill = async () => {
    if (!title || !amount || !dueDate || !categoryId || selectedMonths.length === 0) {
      alert('Preencha todos os campos e selecione ao menos um mês!');
      return;
    }
  
    await api.post('/bills', {
      title,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate).toISOString(),
      categoryId,
      year,
      months: selectedMonths,
    });
  
    // Limpa o formulário
    setTitle('');
    setAmount('');
    setDueDate('');
    setCategoryId(null);
    setSelectedMonths([]);
  
    fetchData();
  };

  // Começar edição
  const startEdit = (bill: Bill) => {
    setEditId(bill.id);
    setEditTitle(bill.title);
    setEditAmount(bill.amount.toString());
    setEditDueDate(bill.dueDate.split('T')[0]); // yyyy-mm-dd
    setEditCategoryId(bill.categoryId);
  };

  // Salvar edição
  const handleUpdateBill = async () => {
    if (!editId) return;

    await api.patch(`/bills/${editId}`, {
      title: editTitle,
      amount: parseFloat(editAmount),
      dueDate: new Date(editDueDate).toISOString(), 
      categoryId: editCategoryId,
    });

    setEditId(null);
    fetchData();
  };

  // Excluir conta
  const deleteBill = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      await api.delete(`/bills/${id}`);
      fetchData();
    }
  };

  return (
    <>
      {/* Cabeçalho fixo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md p-4 border-b">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">

          {/* Título */}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📊 Controle de Contas
          </h1>

          {/* Mês e Ano */}
          <div className="flex items-center gap-2">
            <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Mês">
                  {new Date(0, month - 1).toLocaleString("pt-BR", { month: "long" })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(0, m - 1).toLocaleString("pt-BR", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano">{year}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Totais + Exportar */}
          {summary && (
            <div className="flex gap-2 text-sm">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Pago: R$ {summary.totalPaid.toFixed(2)}
              </span>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
                Pendente: R$ {summary.totalPending.toFixed(2)}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/api/bills/pdf?year=${year}`, "_blank");
                }}
              >
                📄 PDF Anual
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Espaço para não cobrir conteúdo do cabeçalho fixo */}
      <div className="pt-28" />

      {/* Conteúdo principal */}
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Resumo + Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de {month}/{year}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            {summary && (
              <>
                <div>
                  <p>Total Pago: R$ {summary.totalPaid.toFixed(2)}</p>
                  <p>Total Pendente: R$ {summary.totalPending.toFixed(2)}</p>
                  <p>Total Geral: R$ {summary.total.toFixed(2)}</p>
                </div>
                <PieChart width={250} height={250}>
                  <Pie
                    data={summary.categories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {summary.categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </>
            )}
          </CardContent>
        </Card>

        {/* Formulário nova conta */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Valor"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Data de Vencimento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Select
              value={categoryId?.toString() || ''}
              onValueChange={(v) => setCategoryId(Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {selectedMonths.length > 0
                    ? `Meses (${selectedMonths.length} selecionados)`
                    : "Selecionar Meses"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <DropdownMenuCheckboxItem
                    key={m}
                    checked={selectedMonths.includes(m)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMonths((prev) => [...prev, m]);
                      } else {
                        setSelectedMonths((prev) => prev.filter((x) => x !== m));
                      }
                    }}
                  >
                    {m} - {new Date(0, m - 1).toLocaleString("pt-BR", { month: "long" })}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleCreateBill}>Adicionar</Button>
          </CardContent>
        </Card>

        {/* Lista de Contas com ações */}
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle>{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {cat.bills.length === 0 ? (
                <p>Nenhuma conta</p>
              ) : (
                sortBillsByDueDate(cat.bills).map((bill) => (
                  <div
                    key={bill.id}
                    className={`flex justify-between items-center border-b mb-2 py-2 px-2 rounded-md transition-all duration-300 ${
                      bill.status === 'paid' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {bill.status === 'paid' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}

                      <div>
                        <p
                          className={
                            bill.status === 'paid'
                              ? 'text-green-700 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {bill.title}
                        </p>
                        <p
                          className={`text-sm ${
                            bill.status === 'paid' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          Vence em: {new Date(bill.dueDate).toLocaleDateString()} — R$ {bill.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                          bill.status === 'paid'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {bill.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>

                      <Button variant="outline" onClick={() => toggleStatus(bill)}>
                        {bill.status === 'pending' ? 'Marcar como Pago' : 'Marcar como Pendente'}
                      </Button>

                      <Dialog open={editId === bill.id} onOpenChange={(open) => { if (!open) setEditId(null) }}>
                        <DialogTrigger asChild>
                          <Button variant="secondary" onClick={() => startEdit(bill)}>Editar</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Conta</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" />
                            <Input value={editAmount} type="number" onChange={(e) => setEditAmount(e.target.value)} placeholder="Valor" />
                            <Input value={editDueDate} type="date" onChange={(e) => setEditDueDate(e.target.value)} />
                            <Select value={editCategoryId?.toString() || ''} onValueChange={(v) => setEditCategoryId(Number(v))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleUpdateBill}>Salvar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="destructive" onClick={() => deleteBill(bill.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}