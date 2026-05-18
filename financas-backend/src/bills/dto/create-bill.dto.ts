import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBillDto {
  @IsString()
  title: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  dueDate: Date;

  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @IsArray()
  months?: number[];

  @IsOptional()
  @IsIn(['single', 'installment', 'recurring', 'custom'])
  recurrenceType?: 'single' | 'installment' | 'recurring' | 'custom';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  installments?: number;
}