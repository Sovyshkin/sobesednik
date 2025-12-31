// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExpertsService } from './experts/experts.service';
import { join } from 'path';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Cookie parser для админ-аутентификации
  app.use(cookieParser());

  // ✅ Включаем CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5555'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ✅ Валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  // ✅ ВАЖНО: Статические файлы должны быть ПЕРЕД другими middleware
  // Путь должен быть абсолютным
  const uploadsDir = join(process.cwd(), 'uploads');
  
  // Логируем путь для отладки
  console.log('📁 Static files directory:', uploadsDir);
  console.log('📁 Full path to expert image:', join(uploadsDir, 'experts', '7602887344', '98b1751468f7c36f85c42868bbc44442.png'));
  
  // Проверяем существует ли файл
  const fs = await import('fs');
  const imagePath = join(uploadsDir, 'experts', '7602887344', '98b1751468f7c36f85c42868bbc44442.png');
  if (fs.existsSync(imagePath)) {
    console.log('✅ Файл существует на сервере');
  } else {
    console.log('❌ Файл НЕ найден по пути:', imagePath);
  }

  // ✅ Обслуживаем статические файлы
  app.use('/uploads', express.static(uploadsDir));

  // ✅ Создаем папки если их нет
  const expertsDir = join(uploadsDir, 'experts');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Создана папка uploads');
  }
  if (!fs.existsSync(expertsDir)) {
    fs.mkdirSync(expertsDir, { recursive: true });
    console.log('📁 Создана папка uploads/experts');
  }

  // ✅ Swagger документация
  const config = new DocumentBuilder()
    .setTitle('Experts API')
    .setDescription('API для системы экспертов-собеседников')
    .setVersion('1.0')
    .addTag('experts')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  try {
    const expertsService = app.get(ExpertsService);
    await expertsService.startExpirationChecker();
    console.log('✅ Планировщик истекших анкет запущен');
  } catch (error) {
    console.error('❌ Ошибка запуска планировщика:', error);
  }

  await app.listen(process.env.PORT || 4000);
  console.log(`🚀 Server is running on http://localhost:${process.env.PORT || 4000}`);
  console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT || 4000}/api`);
  console.log(`📁 Static files available at: http://localhost:${process.env.PORT || 4000}/uploads/`);
  console.log(`🖼️ Test image URL: http://localhost:${process.env.PORT || 4000}/uploads/experts/7602887344/98b1751468f7c36f85c42868bbc44442.png`);
}

bootstrap().catch(error => {
  console.error('💥 Ошибка запуска приложения:', error);
  process.exit(1);
});