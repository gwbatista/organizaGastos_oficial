import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Injectable()
export class BillsService {
  constructor(private prisma: PrismaService) { }

  private addMonths(date: Date, monthsToAdd: number) {
    const newDate = new Date(date);
    const originalDay = newDate.getDate();

    newDate.setMonth(newDate.getMonth() + monthsToAdd);

    if (newDate.getDate() !== originalDay) {
      newDate.setDate(0);
    }

    return newDate;
  }

  async create(data: CreateBillDto) {
    const {
      title,
      amount,
      dueDate,
      categoryId,
      year,
      months = [],
      recurrenceType = 'single',
      installments = 1,
    } = data;

    const baseDate = new Date(dueDate);
    const groupId = randomUUID();

    let billsToCreate: any[] = [];

    if (recurrenceType === 'custom') {
      billsToCreate = months.map((monthNumber, index) => {
        const due = new Date(baseDate);
        due.setFullYear(year || baseDate.getFullYear());
        due.setMonth(monthNumber - 1);

        return {
          title,
          amount,
          dueDate: due,
          categoryId,
          month: monthNumber,
          year: year || baseDate.getFullYear(),
          status: 'pending',
          groupId,
          recurrenceType,
          installmentNumber: index + 1,
          installmentTotal: months.length,
        };
      });
    } else {
      const total = recurrenceType === 'single' ? 1 : installments;

      billsToCreate = Array.from({ length: total }, (_, index) => {
        const due = this.addMonths(baseDate, index);

        return {
          title,
          amount,
          dueDate: due,
          categoryId,
          month: due.getMonth() + 1,
          year: due.getFullYear(),
          status: 'pending',
          groupId,
          recurrenceType,
          installmentNumber: recurrenceType === 'installment' ? index + 1 : null,
          installmentTotal: recurrenceType === 'installment' ? total : null,
        };
      });
    }

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

  async findByGroup(groupId: string) {
    return this.prisma.bill.findMany({
      where: { groupId },
      include: {
        category: true,
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' },
        { dueDate: 'asc' },
      ],
    });
  }

  private async getScopeWhere(id: number, scope: 'single' | 'future' | 'all') {
    const bill = await this.prisma.bill.findUnique({ where: { id } });

    if (!bill) {
      throw new NotFoundException('Conta não encontrada');
    }

    if (scope === 'single' || !bill.groupId) {
      return { id };
    }

    if (scope === 'all') {
      return { groupId: bill.groupId };
    }

    return {
      groupId: bill.groupId,
      OR: [
        { year: { gt: bill.year } },
        {
          year: bill.year,
          month: { gte: bill.month },
        },
      ],
    };
  }

  async update(id: number, data: UpdateBillDto) {
    const { updateScope = 'single', dueDate, ...rest } = data;
    const where = await this.getScopeWhere(id, updateScope);

    const updateData: any = { ...rest };

    if (dueDate) {
      const newDate = new Date(dueDate);
      updateData.dueDate = newDate;
      updateData.month = newDate.getMonth() + 1;
      updateData.year = newDate.getFullYear();
    }

    if (updateScope === 'single') {
      return this.prisma.bill.update({
        where: { id },
        data: updateData,
      });
    }

    return this.prisma.bill.updateMany({
      where,
      data: updateData,
    });
  }

  async remove(id: number, scope: 'single' | 'future' | 'all') {
    const where = await this.getScopeWhere(id, scope);

    if (scope === 'single') {
      return this.prisma.bill.delete({
        where: { id },
      });
    }

    return this.prisma.bill.deleteMany({
      where,
    });
  }

  async getSummary(month: number, year: number) {
    const categories = await this.prisma.category.findMany({
      include: {
        bills: {
          where: { month, year },
        },
      },
    });

    let totalPaid = 0;
    let totalPending = 0;
    let overdue = 0;

    const today = new Date();

    const categoriesSummary = categories.map((category) => {
      const paid = category.bills
        .filter((b) => b.status === 'paid')
        .reduce((sum, b) => sum + b.amount, 0);

      const pending = category.bills
        .filter((b) => b.status === 'pending')
        .reduce((sum, b) => sum + b.amount, 0);

      overdue += category.bills.filter(
        (b) => b.status === 'pending' && new Date(b.dueDate) < today,
      ).length;

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
      overdue,
      paidPercent:
        totalPaid + totalPending > 0
          ? Number(((totalPaid / (totalPaid + totalPending)) * 100).toFixed(2))
          : 0,
      categories: categoriesSummary,
    };
  }
}