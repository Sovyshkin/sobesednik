import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expert } from './entities/expert.entity';
import { CreateExpertDto } from './dto/create-expert.dto';
import { TelegramService } from '../telegram/telegram.service';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { join } from 'path';

const BASE_UPLOADS_PATH = join(__dirname, '..', '..', 'uploads');

@Injectable()
export class ExpertsService {
  constructor(
    @InjectRepository(Expert)
    private expertsRepository: Repository<Expert>,
    private readonly telegramService: TelegramService,     // <-- внедряем TelegramService
  ) {}

  // Создание эксперта (без файлов)
async create(createExpertDto: CreateExpertDto): Promise<Expert> {
  console.log('🎯 Создание эксперта с данными:', createExpertDto);

  const existingExpertByLogin = await this.expertsRepository.findOne({
    where: { login: createExpertDto.login },
  });

  if (existingExpertByLogin) {
    throw new ConflictException('Эксперт с таким логином уже существует');
  }

  const expert = new Expert();
  expert.login = createExpertDto.login;
  expert.password = await bcrypt.hash(createExpertDto.password, 10);
  expert.name = createExpertDto.name;
  expert.age = createExpertDto.age;
  expert.gender = createExpertDto.gender;
  expert.availability = createExpertDto.availability;
  expert.about = createExpertDto.about || '';
  expert.allowedTopics = createExpertDto.allowedTopics || '';
  expert.forbiddenTopics = createExpertDto.forbiddenTopics || '';
  expert.price = createExpertDto.price;
  expert.telegram = createExpertDto.telegram
    ? createExpertDto.telegram.startsWith('@')
      ? createExpertDto.telegram
      : '@' + createExpertDto.telegram
    : null;
  expert.otherMessengers = createExpertDto.otherMessengers || '';
  expert.adultTopics = createExpertDto.adultTopics || false;
  expert.noForbiddenTopics = createExpertDto.noForbiddenTopics || false;
  expert.alwaysAvailable = createExpertDto.alwaysAvailable || false;
  expert.paymentCode = createExpertDto.paymentCode;
  expert.status = this.getValidStatus(createExpertDto.status);
  // Инициализируем рейтинги
    expert.rating = 0;
    expert.ratingCount = 0;
    expert.ratings = '[]';

  const savedExpert = await this.expertsRepository.save(expert);
  await this.saveData();

  // повторное получение — чтобы вернулись createdAt и updatedAt
  const fullExpert = await this.findOne(savedExpert.id);

  console.log('✅ Эксперт создан. ID:', fullExpert.id);
  return fullExpert;
}
// телеграм уведомление
 async notifyExpertViaTelegram(expertId: string, message: string) {
    const expert = await this.expertsRepository.findOne({ where: { id: expertId } });
    if (!expert || !expert.telegram) return;
    await this.telegramService.sendMessage(expert.telegram, message);
  }

// Создание эксперта с файлами
async createWithFiles(
  createExpertDto: any,
  mainPhoto: Express.Multer.File,
  galleryFiles: Express.Multer.File[],
): Promise<Expert> {
  console.log('🎯 Создание эксперта с файлами:', createExpertDto);

  const existingExpertByLogin = await this.expertsRepository.findOne({
    where: { login: createExpertDto.login },
  });

  if (existingExpertByLogin) {
    throw new ConflictException('Эксперт с таким логином уже существует');
  }

  const expert = new Expert();
  expert.login = createExpertDto.login;
  expert.password = await bcrypt.hash(createExpertDto.password, 10);
  expert.name = createExpertDto.name;
  expert.age = createExpertDto.age;
  expert.gender = createExpertDto.gender;
  expert.availability = createExpertDto.availability;
  expert.about = createExpertDto.about || '';
  expert.telegram = createExpertDto.telegram
    ? createExpertDto.telegram.startsWith('@')
      ? createExpertDto.telegram
      : '@' + createExpertDto.telegram
    : null;
  expert.otherMessengers = createExpertDto.otherMessengers || '';
  expert.allowedTopics = createExpertDto.allowedTopics || '';
  expert.forbiddenTopics = createExpertDto.forbiddenTopics || '';
  expert.price = createExpertDto.price;
  expert.adultTopics = createExpertDto.adultTopics || false;
  expert.noForbiddenTopics = createExpertDto.noForbiddenTopics || false;
  expert.alwaysAvailable = createExpertDto.alwaysAvailable || false;
  expert.paymentCode = createExpertDto.paymentCode;
  expert.publicationDays = createExpertDto.publicationDays || 30;
  expert.paymentAmount = createExpertDto.paymentAmount || 0;
  expert.status = 'pending';
  // Инициализируем рейтинги
    expert.rating = 0;
    expert.ratingCount = 0;
    expert.ratings = '[]';

  // Сначала сохраняем эксперта, чтобы получить ID
  const savedExpert = await this.expertsRepository.save(expert);
  console.log('📝 Эксперт сохранен с ID:', savedExpert.id);

  // Теперь перемещаем файлы в папку эксперта
  try {
    const { fs, path } = await this.moveFilesToExpertFolder(
      savedExpert.id,
      mainPhoto,
      galleryFiles,
    );

    // Обновляем пути к файлам
    if (mainPhoto) {
      savedExpert.mainPhotoUrl = `/uploads/experts/${savedExpert.id}/${mainPhoto.filename}`;
    }

    if (galleryFiles && galleryFiles.length > 0) {
      const galleryUrls = galleryFiles.map(
        file => `/uploads/experts/${savedExpert.id}/${file.filename}`,
      );
      savedExpert.galleryUrls = JSON.stringify(galleryUrls);
    }

    // Сохраняем обновленные пути
    await this.expertsRepository.save(savedExpert);
    await this.saveData();

    console.log('✅ Файлы перемещены в папку эксперта:', savedExpert.id);
  } catch (error) {
    console.error('❌ Ошибка при перемещении файлов:', error);
    // Удаляем эксперта, если не удалось переместить файлы
    await this.expertsRepository.delete(savedExpert.id);
    throw error;
  }

  // Получаем полные данные эксперта
  const fullExpert = await this.findOne(savedExpert.id);

  console.log('✅ Эксперт создан с файлами. ID:', fullExpert.id);
  return fullExpert;
}

// Вспомогательный метод для перемещения файлов в папку эксперта
private async moveFilesToExpertFolder(
  expertId: string,
  mainPhoto: Express.Multer.File,
  galleryFiles: Express.Multer.File[],
): Promise<{ fs: any; path: any }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Создаем папку для эксперта
  const expertFolder = join(BASE_UPLOADS_PATH, 'experts', expertId);
  await fs.mkdir(expertFolder, { recursive: true });
  console.log(`📁 Создана папка для эксперта: ${expertFolder}`);

  // Перемещаем главное фото
  if (mainPhoto) {
    const oldPath = join(BASE_UPLOADS_PATH, mainPhoto.filename);
    const newPath = path.join(expertFolder, mainPhoto.filename);
    try {
      await fs.rename(oldPath, newPath);
      console.log(`📸 Главное фото перемещено: ${mainPhoto.filename}`);
    } catch (error: any) {
      console.warn(`⚠️ Не удалось переместить главное фото:`, error.message);
    }
  }

  // Перемещаем файлы галереи
  if (galleryFiles && galleryFiles.length > 0) {
    for (const file of galleryFiles) {
      const oldPath = join(BASE_UPLOADS_PATH, file.filename);
      const newPath = path.join(expertFolder, file.filename);
      try {
        await fs.rename(oldPath, newPath);
        console.log(`🖼️ Файл галереи перемещен: ${file.filename}`);
      } catch (error: any) {
        console.warn(`⚠️ Не удалось переместить файл галереи:`, error.message);
      }
    }
  }

  return { fs, path };
}

  // Валидация эксперта для входа
 async validateExpert(login: string, password: string): Promise<Expert | null> {
  const expert = await this.expertsRepository.findOne({ where: { login } });
  if (!expert) return null;

  // сравниваем введённый пароль с хэшем из БД
  const isMatch = await bcrypt.compare(password, expert.password);
  if (!isMatch) return null;

  return expert;
}

  async getProfile(id: string): Promise<Expert> {
    const expert = await this.findOne(id);
    return expert;
  }

  async findAll(): Promise<Expert[]> {
    return await this.expertsRepository.find({ order: { createdAt: 'DESC' } });
  }

  // Возвращает только активных и проверенных экспертов для публичного отображения
  async findAllActive(): Promise<Expert[]> {
    return await this.expertsRepository.find({ 
      where: { 
        status: 'active',
        adminVerified: true 
      },
      order: { createdAt: 'DESC' } 
    });
  }

  async findOne(id: string): Promise<Expert> {
    const expert = await this.expertsRepository.findOne({ where: { id } });
    if (!expert) throw new NotFoundException('Эксперт не найден');
    return expert;
  }

  async remove(id: string): Promise<void> {
    // Сначала получаем эксперта, чтобы узнать какие файлы нужно удалить
    const expert = await this.findOne(id);
    
    // Удаляем файлы с диска
    await this.deleteExpertFiles(expert);
    
    // Удаляем запись из БД
    const result = await this.expertsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Эксперт не найден');
    }
    await this.saveData(); // заглушка
    
    console.log(`🗑️ Эксперт ${id} и его файлы успешно удалены`);
  }

  // Вспомогательный метод для удаления файлов эксперта
  private async deleteExpertFiles(expert: Expert): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Новая логика: удаляем всю папку эксперта
    const expertFolder = join(BASE_UPLOADS_PATH, 'experts', expert.id);
    
    try {
      // Проверяем, существует ли папка
      await fs.access(expertFolder);
      
      // Удаляем папку со всем содержимым
      await fs.rm(expertFolder, { recursive: true, force: true });
      console.log(`✅ Удалена папка эксперта: ${expertFolder}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️ Не удалось удалить папку эксперта:`, error.message);
      } else {
        console.log(`ℹ️ Папка эксперта не найдена (возможно, старый формат): ${expertFolder}`);
        
        // Fallback для старого формата (файлы в корне uploads)
        await this.deleteExpertFilesOldFormat(expert, fs, path);
      }
    }
  }

  // Fallback метод для удаления файлов в старом формате (без папок)
  private async deleteExpertFilesOldFormat(expert: Expert, fs: any, path: any): Promise<void> {
    const filesToDelete: string[] = [];
    
    // Добавляем главное фото
    if (expert.mainPhotoUrl) {
     const filePath = join(BASE_UPLOADS_PATH, path.basename(expert.mainPhotoUrl));
      filesToDelete.push(filePath);
    }
    
    // Добавляем файлы из галереи
    if (expert.galleryUrls) {
      try {
        const galleryUrls = JSON.parse(expert.galleryUrls);
        if (Array.isArray(galleryUrls)) {
          galleryUrls.forEach(url => {
            const filePath = join(BASE_UPLOADS_PATH, path.basename(url));
            filesToDelete.push(filePath);
          });
        }
      } catch (error) {
        console.warn('⚠️ Ошибка парсинга galleryUrls:', error);
      }
    }
    
    // Удаляем все файлы
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
        console.log(`✅ Удален файл (старый формат): ${filePath}`);
      } catch (error: any) {
        // Файл может не существовать - это нормально
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️ Не удалось удалить файл ${filePath}:`, error.message);
        }
      }
    }
  }

  async update(id: string, updateData: any): Promise<Expert> {
    const expert = await this.findOne(id);
    const { id: _, ...safeUpdateData } = updateData;

    // Проверяем уникальность логина, если он изменяется
    if (safeUpdateData.login && safeUpdateData.login !== expert.login) {
      const existingExpert = await this.expertsRepository.findOne({ 
        where: { login: safeUpdateData.login } 
      });
      if (existingExpert && existingExpert.id !== expert.id) {
        throw new HttpException('Логин уже занят другим пользователем', 400);
      }
    }

    if (safeUpdateData.status) {
      safeUpdateData.status = this.getValidStatus(safeUpdateData.status);
    }

    // Проверка совпадения пароля и подтверждения
    if (safeUpdateData.password) {
      if (!updateData.confirmPassword || safeUpdateData.password !== updateData.confirmPassword) {
        throw new HttpException('Пароль и подтверждение не совпадают', 400);
      }
      safeUpdateData.password = await bcrypt.hash(safeUpdateData.password, 10);
    }

    Object.assign(expert, safeUpdateData);
    const updatedExpert = await this.expertsRepository.save(expert);
    await this.saveData(); // заглушка

    return updatedExpert;
  }

  async updateWithFiles(
    id: string,
    updateData: any,
    mainPhoto?: Express.Multer.File,
    galleryFiles?: Express.Multer.File[],
  ): Promise<Expert> {
    console.log('🔄 Обновление эксперта с файлами:', id, updateData);

    const expert = await this.findOne(id);
    
    // Обновляем данные (исключаем только id)
    const { id: _, ...safeUpdateData } = updateData;
    
    // Проверяем уникальность логина, если он изменяется
    if (safeUpdateData.login && safeUpdateData.login !== expert.login) {
      const existingExpert = await this.expertsRepository.findOne({ 
        where: { login: safeUpdateData.login } 
      });
      if (existingExpert && existingExpert.id !== expert.id) {
        throw new HttpException('Логин уже занят другим пользователем', 400);
      }
    }

    // Хэшируем пароль, если он изменяется
    if (safeUpdateData.password) {
      safeUpdateData.password = await bcrypt.hash(safeUpdateData.password, 10);
    }
    
    Object.assign(expert, safeUpdateData);

    // Обрабатываем файлы если они переданы
    if (mainPhoto || (galleryFiles && galleryFiles.length > 0)) {
      try {
        const { fs, path } = await this.moveFilesToExpertFolder(
          expert.id,
          mainPhoto,
          galleryFiles,
        );

        // Обновляем главное фото
        if (mainPhoto) {
          expert.mainPhotoUrl = `/uploads/experts/${expert.id}/${mainPhoto.filename}`;
        }

        // Обновляем или добавляем к галерее
        if (galleryFiles && galleryFiles.length > 0) {
          const newGalleryUrls = galleryFiles.map(
            file => `/uploads/experts/${expert.id}/${file.filename}`,
          );
          
          // Если есть существующая галерея, добавляем к ней
          let existingGallery = [];
          if (expert.galleryUrls) {
            try {
              existingGallery = JSON.parse(expert.galleryUrls);
            } catch (e) {
              existingGallery = [];
            }
          }
          
          const combinedGallery = [...existingGallery, ...newGalleryUrls];
          expert.galleryUrls = JSON.stringify(combinedGallery);
        }

        console.log('✅ Файлы обновлены для эксперта:', expert.id);
      } catch (error) {
        console.error('❌ Ошибка при обновлении файлов:', error);
        throw error;
      }
    }

    const updatedExpert = await this.expertsRepository.save(expert);
    await this.saveData();

    console.log('✅ Эксперт обновлен:', updatedExpert.id);
    return updatedExpert;
  }

  async requestModeration(expertId: string): Promise<Expert> {
    const expert = await this.findOne(expertId);
    expert.adminVerified = false;
    expert.status = 'pending';
    const savedExpert = await this.expertsRepository.save(expert);
    await this.saveData(); // заглушка
    return savedExpert;
  }

  async approveExpert(expertId: string): Promise<Expert> {
    const expert = await this.findOne(expertId);
    expert.adminVerified = true;
    expert.status = 'active';
    expert.publishedAt = new Date();
    
    // Используем количество дней из заявки или 30 дней по умолчанию
    const daysToAdd = expert.publicationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);
    expert.expiresAt = expiresAt;
    
    const savedExpert = await this.expertsRepository.save(expert);
    await this.saveData(); // заглушка
    
    console.log(`✅ Анкета одобрена. Срок публикации: ${daysToAdd} дней до ${expiresAt.toLocaleDateString('ru-RU')}`);
    
    return savedExpert;
  }

  async rejectExpert(expertId: string, reason: string): Promise<Expert> {
    const expert = await this.findOne(expertId);
    expert.status = 'rejected';
    
    // Удаляем файлы отклоненного эксперта
    await this.deleteExpertFiles(expert);
    
    const savedExpert = await this.expertsRepository.save(expert);
    await this.saveData(); // заглушка
    
    console.log(`❌ Эксперт ${expertId} отклонен. Файлы удалены.`);
    return savedExpert;
  }

  async blockExpert(id: string): Promise<Expert> {
    const expert = await this.findOne(id);
    expert.status = 'rejected'; // можно оставить 'rejected' чтобы соответствовать типу
    expert.adminVerified = false;
    expert.updatedAt = new Date();
    
    // Удаляем файлы заблокированного эксперта
    await this.deleteExpertFiles(expert);
    
    const savedExpert = await this.expertsRepository.save(expert);
    await this.saveData(); // заглушка
    
    console.log(`🚫 Эксперт ${id} заблокирован. Файлы удалены.`);
    return savedExpert;
  }

  // Проверка истекших анкет
  async checkAndRemoveExpiredExperts(): Promise<void> {
    const now = new Date();
    const expiredExperts = await this.expertsRepository
      .createQueryBuilder('expert')
      .where('expert.status = :status', { status: 'active' })
      .andWhere('expert.expiresAt < :now', { now })
      .getMany();

    for (const expert of expiredExperts) {
      await this.expertsRepository.remove(expert);
    }
  }

  // Метод запуска планировщика
  async startExpirationChecker(): Promise<void> {
    setInterval(() => this.checkAndRemoveExpiredExperts(), 60 * 1000); // каждую минуту
    await this.checkAndRemoveExpiredExperts(); // первая проверка сразу
    console.log('⏰ Планировщик удаления истекших анкет запущен');
  }


  // Вспомогательный метод для проверки статуса
  private getValidStatus(
    status: string,
  ): 'draft' | 'pending' | 'active' | 'expired' | 'rejected' {
    const validStatuses = ['draft', 'pending', 'active', 'expired', 'rejected'];
    return validStatuses.includes(status) ? (status as any) : 'draft';
  }

  // Заглушка saveData для TS
  private async saveData(): Promise<void> {
    return;
  }  

  // Верификация эксперта через онлайн-встречу
async verifyExpert(expertId: string): Promise<Expert> {
  const expert = await this.findOne(expertId);
  expert.expertIsVerified = true;
  const savedExpert = await this.expertsRepository.save(expert);
  await this.saveData();
  
  console.log(`✅ Эксперт ${expertId} верифицирован через встречу`);
  return savedExpert;
}

// Снятие верификации эксперта
async unverifyExpert(expertId: string): Promise<Expert> {
  const expert = await this.findOne(expertId);
  expert.expertIsVerified = false;
  const savedExpert = await this.expertsRepository.save(expert);
  await this.saveData();
  
  console.log(`🚫 Верификация эксперта ${expertId} снята`);
  return savedExpert;
}
// Удаление отзывов 
 async deleteReview(expertId: string, reviewIndex: number): Promise<Expert> {
    const expert = await this.findOne(expertId);
    
    if (!expert.reviews) {
      throw new NotFoundException('Отзывы не найдены');
    }

    const reviews = JSON.parse(expert.reviews);
    
    // Проверяем, существует ли отзыв с таким индексом
    if (reviewIndex < 0 || reviewIndex >= reviews.length) {
      throw new NotFoundException('Отзыв не найден');
    }

    // Удаляем отзыв из массива
    reviews.splice(reviewIndex, 1);
    
    expert.reviews = JSON.stringify(reviews);
    await this.expertsRepository.save(expert);

    console.log(`✅ Отзыв с индексом ${reviewIndex} удален экспертом ${expert.name}`);

    return expert;
  }

// Метод для добавления новой оценки
  async addRating(expertId: string, rating: number): Promise<Expert> {
    const expert = await this.findOne(expertId);
    
    // Парсим существующие оценки
    let ratings: number[] = [];
    if (expert.ratings) {
      try {
        ratings = JSON.parse(expert.ratings);
      } catch (e) {
        ratings = [];
      }
    }

    // Добавляем новую оценку
    ratings.push(rating);
    
    // Пересчитываем средний рейтинг
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    
    // Обновляем эксперта
    expert.ratings = JSON.stringify(ratings);
    expert.rating = parseFloat(averageRating.toFixed(2));
    expert.ratingCount = ratings.length;

    const savedExpert = await this.expertsRepository.save(expert);
    await this.saveData();
    
    console.log(`⭐ Добавлена оценка ${rating} для эксперта ${expertId}. Новый рейтинг: ${averageRating.toFixed(2)}`);
    
    return savedExpert;
  }

  // Метод для получения детальной информации о рейтинге
  getRatingStats(ratings: number[]) {
    if (!ratings.length) {
      return {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      const star = Math.round(rating);
      if (star >= 1 && star <= 5) {
        distribution[star]++;
      }
    });

    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    return {
      average: parseFloat(average.toFixed(2)),
      count: ratings.length,
      distribution
    };
  }

  // Восстановление доступа к аккаунту эксперта
  async sendResetCode(login: string, telegram: string) {
  const expert = await this.expertsRepository.findOne({ where: { login } });

  if (!expert) {
    throw new HttpException('Пользователь не найден', 404);
  }

  // Проверяем формат telegram
  if (!telegram.startsWith('@')) {
    throw new HttpException('Укажите Telegram в формате @username', 400);
  }

  if (expert.telegram !== telegram) {
    throw new HttpException('Telegram не совпадает с указанным в анкете', 400);
  }

  // Генерация кода
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Сохранение кода
  expert.resetCode = code;
  await this.expertsRepository.save(expert);

  try {
    // Отправка сообщения
    await this.telegramService.sendMessage(
      telegram, // передаем username в формате @username
      `Код для восстановления пароля: ${code}\n\nВернитесь на сайт и введите этот код.`
    );

    return { 
      success: true, 
      message: 'Код отправлен в Telegram' 
    };
  } catch (error) {
    // Если не удалось отправить сообщение
    expert.resetCode = null;
    await this.expertsRepository.save(expert);
    
    throw new HttpException(
      'Не удалось отправить код. Убедитесь, что вы написали боту @sobesednik_helper_bot',
      400
    );
  }
}

async resetPassword(login: string, code: string, password: string) {
  const expert = await this.expertsRepository.findOne({ where: { login } });

  if (!expert || expert.resetCode !== code) {
    throw new HttpException('Неверный код', 400);
  }

  // Хэшируем пароль
  const hashed = await bcrypt.hash(password, 10);

  expert.password = hashed;
  expert.resetCode = null;

  await this.expertsRepository.save(expert);

  return { message: 'Пароль успешно изменён' };
}

}
