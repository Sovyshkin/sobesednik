import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  UnauthorizedException,
  NotFoundException,
  Patch,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ExpertsService } from './experts.service';
import { CreateExpertDto } from './dto/create-expert.dto';
import { LoginExpertDto } from './dto/login-expert.dto';

@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  // Восстановление доступа к аккаунту эксперта
@Post('reset')
async sendResetCode(@Body() body: any) {
  const { login, telegram } = body;
  return this.expertsService.sendResetCode(login, telegram);
}
@Post('reset/confirm')
async confirmReset(@Body() body: any) {
  const { login, code, password } = body;
  return this.expertsService.resetPassword(login, code, password);
}



  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateExpertDto: any
  ) {
    console.log('📝 Обновление эксперта:', id, updateExpertDto);
    
    const expert = await this.expertsService.update(id, updateExpertDto);
    console.log('✅ Эксперт обновлен:', expert);
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      alwaysAvailable: expert.alwaysAvailable,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount
    };
  }

  // ВАЖНО: специфичные роуты (с параметрами) должны быть ПЕРЕД общими
  @Post('with-files')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainPhoto', maxCount: 1 },
      { name: 'gallery', maxCount: 10 }
    ], {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else {
          cb(new Error('Only images and videos are allowed'), false);
        }
      },
    })
  )
  async createWithFiles(
    @UploadedFiles() files: { mainPhoto?: Express.Multer.File[], gallery?: Express.Multer.File[] },
    @Body() createExpertDto: any // Изменено с CreateExpertDto на any для FormData
  ) {
    console.log('📨 Получен запрос с файлами:', createExpertDto);
    console.log('📁 Файлы:', files);

    // Преобразуем строки из FormData в правильные типы
    const normalizedDto = {
      ...createExpertDto,
      age: parseInt(createExpertDto.age),
      price: parseFloat(createExpertDto.price),
      adultTopics: createExpertDto.adultTopics === 'true',
      noForbiddenTopics: createExpertDto.noForbiddenTopics === 'true',
      alwaysAvailable: createExpertDto.alwaysAvailable === 'true',
      publicationDays: parseInt(createExpertDto.publicationDays || '30'),
      paymentAmount: parseFloat(createExpertDto.paymentAmount || '0'),
    };

    console.log('🔄 Нормализованные данные:', normalizedDto);

    const mainPhoto = files?.mainPhoto?.[0];
    const galleryFiles = files?.gallery || [];

    const expert = await this.expertsService.createWithFiles(
      normalizedDto, 
      mainPhoto, 
      galleryFiles
    );

    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      galleryUrls: expert.galleryUrls ? JSON.parse(expert.galleryUrls) : [],
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      status: expert.status,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount,
      createdAt: expert.createdAt
    };
  }

  @Post()
  async create(@Body() createExpertDto: CreateExpertDto) {
    console.log('📨 Получен POST запрос с данными:', createExpertDto);
    
    const expert = await this.expertsService.create(createExpertDto);
    console.log('✅ Создан эксперт:', expert);
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      galleryUrls: expert.galleryUrls,
      createdAt: expert.createdAt,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      alwaysAvailable: expert.alwaysAvailable,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount
    };
  }

  @Post('login')
  async login(@Body() loginExpertDto: LoginExpertDto) {
    console.log('🚪 Запрос на вход:', loginExpertDto)
    
    const expert = await this.expertsService.validateExpert(
      loginExpertDto.login,
      loginExpertDto.password
    );

    if (!expert) {
      console.log('❌ Вход отклонен: неверные данные')
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    console.log('✅ Вход успешен для эксперта:', expert.name)
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      alwaysAvailable: expert.alwaysAvailable,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount
    };
  }

  @Post(':id/update')
  async updateViaPost(
    @Param('id') id: string, 
    @Body() updateExpertDto: any
  ) {
    console.log('📝 Обновление эксперта через POST:', id, updateExpertDto);
    
    const expert = await this.expertsService.update(id, updateExpertDto);
    console.log('✅ Эксперт обновлен:', expert);
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      alwaysAvailable: expert.alwaysAvailable,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount
    };
  }

  // Обновление эксперта с файлами
  @Post(':id/update-with-files')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainPhoto', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ])
  )
  async updateWithFiles(
    @Param('id') id: string,
    @UploadedFiles() files: { mainPhoto?: Express.Multer.File[], gallery?: Express.Multer.File[] },
    @Body() updateExpertDto: any
  ) {
    console.log('📝 Обновление эксперта с файлами:', id, updateExpertDto);
    console.log('📁 Файлы:', files);

    // Преобразуем строки из FormData в правильные типы
    const normalizedDto = {
      ...updateExpertDto,
      age: updateExpertDto.age ? parseInt(updateExpertDto.age) : undefined,
      price: updateExpertDto.price ? parseFloat(updateExpertDto.price) : undefined,
      adultTopics: updateExpertDto.adultTopics === 'true',
      noForbiddenTopics: updateExpertDto.noForbiddenTopics === 'true',
      alwaysAvailable: updateExpertDto.alwaysAvailable === 'true',
    };

    const mainPhoto = files?.mainPhoto?.[0];
    const galleryFiles = files?.gallery || [];

    const expert = await this.expertsService.updateWithFiles(
      id,
      normalizedDto,
      mainPhoto,
      galleryFiles
    );

    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      galleryUrls: expert.galleryUrls ? JSON.parse(expert.galleryUrls) : [],
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      alwaysAvailable: expert.alwaysAvailable,
      status: expert.status,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount,
      createdAt: expert.createdAt
    };
  }

  // 🚫 Блокировка анкеты админом
  @Post('admin/:id/block')
  async blockExpert(@Param('id') id: string) {
    console.log('🚫 Блокировка анкеты эксперта:', id);

    const expert = await this.expertsService.blockExpert(id);

    console.log('✅ Эксперт заблокирован:', expert);

    return {
      id: expert.id,
      status: expert.status,
      adminVerified: expert.adminVerified
    };
  }

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    const expert = await this.expertsService.getProfile(id);

    // Парсим ratings
    let ratings: number[] = [];
    if (expert.ratings) {
      try {
        ratings = JSON.parse(expert.ratings);
      } catch (e) {
        ratings = [];
      }
    }
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      galleryUrls: expert.galleryUrls,      
      totalSessions: expert.totalSessions,
      adminVerified: expert.adminVerified,
      expertIsVerified: expert.expertIsVerified,
      status: expert.status,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      createdAt: expert.createdAt,
      alwaysAvailable: expert.alwaysAvailable,
      paymentCode: expert.paymentCode,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount,
      publishedAt: expert.publishedAt,
      expiresAt: expert.expiresAt,
      expiredAt: expert.expiredAt, // Дата попадания в "Истекшие"
      rating: expert.rating,
      ratingCount: expert.ratingCount,
      ratings: ratings, // ← ДОБАВЛЯЕМ МАССИВ ОЦЕНОК
    };
  }

  // Endpoint для админа - возвращает всех экспертов (включая на модерации)
@Get('admin/all')
async findAllForAdmin() {
  console.log('🔍 Запрос к /experts/admin/all');
  const experts = await this.expertsService.findAll();
  console.log(`📊 Найдено экспертов для админа: ${experts.length}`);
  return experts.map(expert => {
    let reviews = [];
    if (expert.reviews) {
      try {
        reviews = JSON.parse(expert.reviews);
      } catch (e) {
        reviews = [];
      }
    }
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      status: expert.status,
      adminVerified: expert.adminVerified,
      expertIsVerified: expert.expertIsVerified,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      createdAt: expert.createdAt,
      updatedAt: expert.updatedAt,
      alwaysAvailable: expert.alwaysAvailable,
      publishedAt: expert.publishedAt,
      expiresAt: expert.expiresAt,
      expiredAt: expert.expiredAt, // ← ДОБАВЛЯЕМ ДАТУ ПОПАДАНИЯ В "ИСТЕКШИЕ"
      reviews: reviews, // ← ДОБАВЛЯЕМ ОТЗЫВЫ
      reviewsCount: reviews.length // ← И количество отзывов для удобства
    };
  });
}
  
  @Get()
async findAll() {
  console.log('🔍 Запрос к /experts (публичный endpoint)');
  // Возвращаем только активных и проверенных экспертов для публичного списка
  const experts = await this.expertsService.findAllActive();
  console.log(`📊 Найдено активных экспертов: ${experts.length}`);
  return experts.map(expert => {
    // Парсим отзывы для подсчета количества
    let reviews = [];
    if (expert.reviews) {
      try {
        reviews = JSON.parse(expert.reviews);
      } catch (e) {
        console.warn('Ошибка парсинга отзывов');
        reviews = [];
      }
    }
    
    return {
     id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      gender: expert.gender,
      availability: expert.availability,
      about: expert.about,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      status: expert.status,
      adminVerified: expert.adminVerified,
      expertIsVerified: expert.expertIsVerified,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      createdAt: expert.createdAt,
      updatedAt: expert.updatedAt,
      alwaysAvailable: expert.alwaysAvailable,
      reviews: reviews, // ← ДОБАВЛЯЕМ ОТЗЫВЫ
      reviewsCount: reviews.length // ← И количество отзывов для удобства
    };
  });
}

  @Get('debug/:id')
  async debugExpert(@Param('id') id: string) {
    const expert = await this.expertsService.findOne(id);
    return {
      rawData: expert,
      createdAt: expert.createdAt,
      createdAtType: typeof expert.createdAt,
      login: expert.login
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const expert = await this.expertsService.findOne(id);
    
    // Парсим отзывы из JSON строки
    let reviews = [];
    if (expert.reviews) {
      try {
        reviews = JSON.parse(expert.reviews);
      } catch (e) {
        console.warn('Ошибка парсинга отзывов');
        reviews = [];
      }
    }
    
    return {
      id: expert.id,
      login: expert.login,
      name: expert.name,
      age: expert.age,
      availability: expert.availability,
      about: expert.about,
      allowedTopics: expert.allowedTopics,
      forbiddenTopics: expert.forbiddenTopics,
      price: expert.price,
      mainPhotoUrl: expert.mainPhotoUrl,
      galleryUrls: expert.galleryUrls,
      rating: expert.rating,
      totalSessions: expert.totalSessions,
      adminVerified: expert.adminVerified,
      expertIsVerified: expert.expertIsVerified,
      status: expert.status,
      telegram: expert.telegram,
      otherMessengers: expert.otherMessengers,
      adultTopics: expert.adultTopics,
      noForbiddenTopics: expert.noForbiddenTopics,
      paymentCode: expert.paymentCode,
      createdAt: expert.createdAt,
      alwaysAvailable: expert.alwaysAvailable,
      publicationDays: expert.publicationDays,
      paymentAmount: expert.paymentAmount,
      publishedAt: expert.publishedAt,
      expiresAt: expert.expiresAt,
      expiredAt: expert.expiredAt, // Дата попадания в "Истекшие"
      reviews: reviews
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.expertsService.remove(id);
    return { message: 'Эксперт успешно удален' };
  }

  @Post(':id/moderation')
  async requestModeration(@Param('id') id: string) {
    console.log('📋 Запрос модерации для эксперта:', id);
    
    const expert = await this.expertsService.requestModeration(id);
    console.log('✅ Статус модерации обновлен:', expert);
    
    return {
      id: expert.id,
      status: expert.status,
      adminVerified: expert.adminVerified
    };
  }

  // Одобрение эксперта
  @Post('admin/:id/approve')
  async approveExpert(@Param('id') id: string) {
    console.log('✅ Одобрение эксперта:', id);
    
    const expert = await this.expertsService.approveExpert(id);
    console.log('✅ Эксперт одобрен:', expert);
    
    return {
      id: expert.id,
      status: expert.status,
      adminVerified: expert.adminVerified,
      publishedAt: expert.publishedAt,
      expiresAt: expert.expiresAt
    };
  }

  // Отклонение эксперта
  @Post('admin/:id/reject')
  async rejectExpert(
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    console.log('❌ Отклонение эксперта:', id, 'Причина:', body.reason);
    
    const expert = await this.expertsService.rejectExpert(id, body.reason);
    console.log('✅ Эксперт отклонен:', expert);
    
    return {
      id: expert.id,
      status: expert.status
    };
  }

  // уведомление телеграм
  @Post(':id/notify')
  async notifyExpert(@Param('id') id: string, @Body('message') message: string) {
    await this.expertsService.notifyExpertViaTelegram(id, message);
    return { success: true };
  }

  // Обновление рейтинга - теперь добавляем оценку в массив
  @Post(':id/rating')
  async addRating(
    @Param('id') id: string,
    @Body('rating') rating: number
  ) {
    console.log('⭐ Добавление оценки эксперту:', id, 'Оценка:', rating);

    // Проверяем валидность оценки
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Оценка должна быть от 1 до 5');
    }

    const expert = await this.expertsService.addRating(id, rating);

    // Получаем статистику рейтинга для ответа
    let ratings: number[] = [];
    if (expert.ratings) {
      try {
        ratings = JSON.parse(expert.ratings);
      } catch (e) {
        ratings = [];
      }
    }

    const ratingStats = this.expertsService.getRatingStats(ratings);

    console.log('✅ Оценка добавлена. Новый рейтинг:', expert.rating);
    
    return {
      id: expert.id,
      rating: expert.rating,
      ratingCount: expert.ratingCount,
      ratingStats
    };
  }

  // Получение детальной статистики рейтинга
  @Get(':id/rating/stats')
  async getRatingStats(@Param('id') id: string) {
    const expert = await this.expertsService.findOne(id);
    
    let ratings: number[] = [];
    if (expert.ratings) {
      try {
        ratings = JSON.parse(expert.ratings);
      } catch (e) {
        ratings = [];
      }
    }

    const stats = this.expertsService.getRatingStats(ratings);

    return {
      id: expert.id,
      ...stats
    };
  }


  // Добавление отзыва
  @Post(':id/reviews')
  async addReview(
    @Param('id') id: string,
    @Body() review: { text: string; date: string }
  ) {
    console.log('💬 Добавление отзыва для эксперта:', id, review);
    
    const expert = await this.expertsService.findOne(id);
    if (!expert) {
      throw new NotFoundException('Эксперт не найден');
    }

    let reviews = [];
    if (expert.reviews) {
      try {
        reviews = JSON.parse(expert.reviews);
      } catch (e) {
        console.warn('Ошибка парсинга отзывов, создаем новый массив');
        reviews = [];
      }
    }

    reviews.push(review);
    await this.expertsService.update(id, { reviews: JSON.stringify(reviews) });

    console.log('✅ Отзыв добавлен. Всего отзывов:', reviews.length);
    
    return {
      id: expert.id,
      reviews: reviews
    };
  }

  // Удаление отзыва экспертом - используем POST чтобы не конфликтовать с DELETE эксперта
  @Post(':expertId/reviews/:reviewIndex/delete')
  async deleteReview(
    @Param('expertId') expertId: string,
    @Param('reviewIndex') reviewIndex: string // Принимаем как строку
  ) {
    console.log(`🗑️ Эксперт ${expertId} удаляет отзыв с индексом ${reviewIndex}`);
    
    // Преобразуем в число
    const index = parseInt(reviewIndex, 10);
    
    // Проверяем, что преобразование прошло успешно
    if (isNaN(index)) {
      throw new BadRequestException('Неверный индекс отзыва');
    }
    
    const expert = await this.expertsService.deleteReview(expertId, index);
    
    return {
      success: true,
      message: 'Отзыв удален',
      reviews: expert.reviews ? JSON.parse(expert.reviews) : []
    };
  }

  // Верификация эксперта через встречу
@Post('admin/:id/verify')
async verifyExpert(@Param('id') id: string) {
  console.log('✅ Верификация эксперта через встречу:', id);
  
  const expert = await this.expertsService.verifyExpert(id);
  console.log('✅ Эксперт верифицирован:', expert);
  
  return {
    id: expert.id,
    expertIsVerified: expert.expertIsVerified
  };
}

// Снятие верификации эксперта
@Post('admin/:id/unverify')
async unverifyExpert(@Param('id') id: string) {
  console.log('🚫 Снятие верификации эксперта:', id);
  
  const expert = await this.expertsService.unverifyExpert(id);
  console.log('✅ Верификация снята:', expert);
  
  return {
    id: expert.id,
    expertIsVerified: expert.expertIsVerified
  };
}

// Продление публикации анкеты эксперта вручную админом
@Post('admin/:id/extend')
async extendPublication(
  @Param('id') id: string,
  @Body() body: { days: number }
) {
  if (!body.days || body.days <= 0) {
    throw new BadRequestException('Количество дней должно быть больше 0');
  }

  const expert = await this.expertsService.extendPublication(id, body.days);

  return {
    id: expert.id,
    expiresAt: expert.expiresAt,
  };
}

// 🧪 ТЕСТОВЫЙ ENDPOINT: Установить expiresAt в прошлое для тестирования функционала "Истекшие"
@Post('admin/:id/test-expire')
async testExpire(@Param('id') id: string) {
  const expert = await this.expertsService.findOne(id);
  
  // Устанавливаем expiresAt на 1 минуту назад для быстрого тестирования
  const pastDate = new Date();
  pastDate.setMinutes(pastDate.getMinutes() - 1);
  expert.expiresAt = pastDate;
  expert.status = 'active'; // Возвращаем в active чтобы планировщик мог перевести в expired
  
  const saved = await this.expertsService.update(id, {
    expiresAt: pastDate,
    status: 'active'
  });
  
  console.log(`🧪 ТЕСТ: Установлен expiresAt в прошлое для анкеты ${id}`);
  
  // Запускаем проверку вручную
  const expertsService = this.expertsService as any;
  await expertsService.checkAndRemoveExpiredExperts();
  
  // Получаем обновленную анкету
  const updatedExpert = await this.expertsService.findOne(id);
  
  return {
    id: updatedExpert.id,
    status: updatedExpert.status,
    expiresAt: updatedExpert.expiresAt,
    expiredAt: updatedExpert.expiredAt,
    message: updatedExpert.status === 'expired' 
      ? '✅ Анкета успешно переведена в статус "Истекшие"' 
      : '⚠️ Анкета еще не переведена в expired (проверьте планировщик)'
  };
}

}