import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateBillDto) {
    const { title, amount, dueDate, categoryId, year, months } = data;
  
    const baseDate = new Date(dueDate);
  
    // Gera registros apenas para os meses informados
    const billsToCreate = months.map((monthNumber) => {
      const due = new Date(baseDate);
      due.setMonth(monthNumber - 1); // meses no JS começam em 0
  
      return {
        title,
        amount,
        dueDate: due,
        categoryId,
        month: monthNumber,
        year,
        status: 'pending',
      };
    });
  
    return this.prisma.bill.createMany({
      data: billsToCreate,
    });
  }  

  async findByMonthYear(month: number, year: number) {
    return this.prisma.category.findMany({
      include: {
        bills: {
          where: { month, year },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
  }
  

  async updateStatus(id: number, { status }: UpdateStatusDto) {
    return this.prisma.bill.update({
      where: { id },
      data: { status },
    });
  }

  async update(id: number, data: UpdateBillDto) {
    return this.prisma.bill.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.bill.delete({
      where: { id },
    });
  }

  async getSummary(month: number, year: number) {
    // Busca todas as categorias com as contas do mês/ano
    const categories = await this.prisma.category.findMany({
      include: {
        bills: {
          where: { month, year },
        },
      },
    });
  
    // Calcula totais gerais
    let totalPaid = 0;
    let totalPending = 0;
  
    const categoriesSummary = categories.map(category => {
      const paid = category.bills
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.amount, 0);
  
      const pending = category.bills
        .filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + b.amount, 0);
  
      totalPaid += paid;
      totalPending += pending;
  
      return {
        category: category.name,
        totalPaid: paid,
        totalPending: pending,
        total: paid + pending,
      };
    });
  
    return {
      totalPaid,
      totalPending,
      total: totalPaid + totalPending,
      categories: categoriesSummary,
    };
  }
  
  
}
