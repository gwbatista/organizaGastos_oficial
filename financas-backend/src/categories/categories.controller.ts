import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body('name') name: string) {
    return this.categoriesService.create(name);
  }

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }
}
