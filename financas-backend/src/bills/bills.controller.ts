import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) { }

  @Post()
  create(@Body() data: CreateBillDto) {
    return this.billsService.create(data);
  }

  @Get('summary')
  getSummary(@Query('month') month: number, @Query('year') year: number) {
    return this.billsService.getSummary(Number(month), Number(year));
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.billsService.findByGroup(groupId);
  }

  @Get()
  findByMonthYear(@Query('month') month: number, @Query('year') year: number) {
    return this.billsService.findByMonthYear(Number(month), Number(year));
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: number, @Body() data: UpdateStatusDto) {
    return this.billsService.updateStatus(Number(id), data);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() data: UpdateBillDto) {
    return this.billsService.update(Number(id), data);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Query('scope') scope?: 'single' | 'future' | 'all') {
    return this.billsService.remove(Number(id), scope || 'single');
  }
}