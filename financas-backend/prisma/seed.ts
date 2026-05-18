import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Criar categorias se não existirem
  const categories = ['Casa', 'Pessoal', 'Empresa'];

  for (const name of categories) {
    const exists = await prisma.category.findUnique({ where: { name } });
    if (!exists) {
      await prisma.category.create({ data: { name } });
    }
  }

  console.log('✅ Categorias criadas com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
