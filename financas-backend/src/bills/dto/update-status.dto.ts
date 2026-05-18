import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['pending', 'paid'])
  status: 'pending' | 'paid';
}
