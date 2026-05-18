import { IsString, IsNumber, IsDateString, IsInt, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateBillDto {
  @IsString()
  title: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  dueDate: Date;

  @IsInt()
  categoryId: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  months: number[]; // meses desejados (1 a 12)
}
