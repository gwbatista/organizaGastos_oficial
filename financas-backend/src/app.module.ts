import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { BillsModule } from './bills/bills.module';

@Module({
  imports: [PrismaModule, CategoriesModule, BillsModule],
})
export class AppModule {}
