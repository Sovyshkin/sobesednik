<template>
  <div v-if="loading">
    <p>Загрузка данных собеседника...</p>
  </div>

  <div v-else-if="expert" class="expert-detail">
    <button class="back-btn" @click="goBack">← Вернуться к списку</button>

    <div class="notice">
      💬 Вы можете договориться с cобеседником об удобной форме общения. Ваш приватный разговор может состояться в любом
      из мессенджеров.
    </div>

    <!-- Главное фото и информация -->
    <div class="main-info">
      <img :src="getImageUrl(expert.mainPhotoUrl) || getDefaultAvatar()" alt="Фото собеседника" class="main-photo" />
      <div class="details">
        <h1>{{ expert.name }}</h1>
        <!-- Отображение рейтинга с частичными звездами -->
        <div class="rating-header">
          <div class="stars-display">
            <span v-for="star in 5" :key="star" class="star-display" :class="getStarClass(star)">
              ★
            </span>
          </div>
          <p class="rating-text"> <strong> {{ expert.rating.toFixed(1) }}</strong>
           
          </p>
        </div>
        
        <span v-if="expert.expertIsVerified" class="tag tag-is-verified">Данные подтверждены администарацией</span>
        <p><strong>Возраст:</strong> {{ expert.age }}</p>
        <!-- <p><strong>Пол:</strong> {{ expert.gender === 'male' ? 'Мужской' : 'Женский' }}</p> -->
        <p><strong>Статус:</strong> {{ expert.availability }}</p>
        <p><strong>Стоимость часа от:</strong> {{ expert.price }} ₽</p>

        <!-- Дополнительные характеристики -->
        <div class="expert-characteristics">
          <span v-if="expert.alwaysAvailable" class="char-badge char-available">
            🕐 Доступен 24/7
          </span>
          <span v-if="expert.adultTopics" class="char-badge char-adult">
            🔞 Темы 18+
          </span>
          <span v-if="expert.noForbiddenTopics" class="char-badge char-no-forbidden">
            ✅ Без запретов
          </span>
        </div>

        <p>
          <strong>Telegram:</strong>
          <a v-if="expert.telegram" href="#" @click.prevent="handleTelegramClick" class="telegram-link">
            {{ expert.telegram }}
          </a>
          <span v-else>—</span>
        </p>
        <div v-if="otherMessengersList.length">
          <p><strong>Другие мессенджеры:</strong></p>
          <div class="other-messengers">
            <a v-for="(link, index) in otherMessengersList" :key="index" :href="getMessengerInfo(link).href"
              target="_blank" rel="noopener" class="other-messenger-link">
              <strong>{{ getMessengerInfo(link).icon }} {{ getMessengerInfo(link).name }} </strong>
            </a>
          </div>
        </div>

        <p><strong>Разрешённые темы:</strong> {{ expert.allowedTopics }}</p>
        <p v-if="expert.forbiddenTopics"><strong>Запрещённые темы:</strong> {{ expert.forbiddenTopics }}</p>

      </div>
    </div>
    <!-- Модальное окно жалобы -->
    <div v-if="complaintModalVisible" class="complaint-modal" @click="hideComplaintModal">
      <div class="complaint-modal-content" @click.stop>
        <button class="complaint-close" @click="hideComplaintModal">×</button>
        <h3>Пожаловаться на собеседника</h3>
        <p>При возникновении спорной ситуации, напиши нам на почту:</p>
        <div class="complaint-email">
          <a href="mailto:podderzhkasobesednik@gmail.com">podderzhkasobesednik@gmail.com</a>
        </div>
        <p class="complaint-note">Мы рассмотрим вашу жалобу в кратчайшие сроки.</p>
        <button @click="hideComplaintModal" class="complaint-confirm-btn">Понятно</button>
      </div>
    </div>
    <div class="about-section" v-if="expert.about">
      <h3>О себе</h3>
      <p>{{ expert.about }}</p>

    </div>

    <!-- Галерея -->
    <div v-if="galleryUrls && galleryUrls.length" class="gallery">
      <h3>Галерея</h3>
      <div class="gallery-grid">
        <div v-for="(url, idx) in galleryUrls" :key="idx" class="gallery-item">
          <img v-if="isImage(url)" :src="getImageUrl(url)" :alt="`Фото ${idx + 1}`" @click="openLightbox(idx)" />
          <video v-else controls :src="getImageUrl(url)" @click="openVideoModal(url)">
            Ваш браузер не поддерживает видео.
          </video>
        </div>
      </div>
    </div>

    <!-- Лайтбокс для изображений -->
    <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <button class="lightbox-close" @click="closeLightbox">×</button>
        <button class="lightbox-nav lightbox-prev" @click="prevImage">‹</button>
        <img :src="getImageUrl(currentLightboxUrl)" alt="Просмотр галереи" />
        <button class="lightbox-nav lightbox-next" @click="nextImage">›</button>
      </div>
    </div>

    <!-- Простое модальное окно для видео -->
    <div v-if="videoModalVisible" class="video-modal" @click="closeVideoModal">
      <div class="video-modal-content" @click.stop>
        <button class="video-modal-close" @click="closeVideoModal">×</button>
        <video controls :src="getImageUrl(currentVideoUrl)" class="modal-video">
          Ваш браузер не поддерживает видео.
        </video>
      </div>
    </div>

    <!-- Рейтинг -->
    <div class="rating-section">

      <!-- Форма для добавления оценки, рейтинга -->
      <div class="rating-input">
        <h4>Поставить оценку</h4>
        <div class="stars-input">
          <span v-for="star in 5" :key="star" class="star-input" :class="{
            active: star <= hoverRating || star <= currentRating,
            hover: star <= hoverRating
          }" @click="setRating(star)" @mouseenter="hoverRating = star" @mouseleave="hoverRating = 0">
            ★
          </span>
        </div>
        <p v-if="currentRating > 0" class="selected-rating">
          Вы поставили: {{ currentRating }} ★
        </p>
      </div>

      <!-- Детальная статистика рейтинга -->
      <!-- <div v-if="ratingStats" class="rating-stats">
        <h4>Детальная статистика</h4>
        <div class="stats-bars">
          <div 
            v-for="n in 5" 
            :key="n" 
            class="stat-row"
          >
            <span class="stat-star">{{ 6 - n }} ★</span>
            <div class="stat-bar">
              <div 
                class="stat-fill" 
                :style="{ width: getPercentage(6 - n) + '%' }"
              ></div>
            </div>
            <span class="stat-count">
              {{ ratingStats.distribution[6 - n] || 0 }}
            </span>
          </div>
        </div>
      </div> -->
    </div>

    <!-- Отзывы -->
    <div class="reviews">
      <h3>Отзывы</h3>

      <!-- Форма добавления отзыва -->
      <div class="review-input-container">
        <textarea v-model="newReview" @input="handleReviewInput" placeholder="Напишите отзыв (минимум 6 символов)..."
          rows="3" :class="{ error: reviewError }"></textarea>

        <div class="character-counter" :class="{ 'limit-reached': newReview.length >= 500 }">
          {{ newReview.length }}/500
        </div>

        <div v-if="reviewError" class="error-message">
          {{ reviewError }}
        </div>
      </div>

      <button @click="addReview" :disabled="!newReview.trim() || newReview.trim().length < 6 || newReview.length > 500"
        class="review-submit-btn">
        Добавить отзыв
      </button>

      <!-- Список отзывов -->
      <div v-if="expert.reviews && expert.reviews.length > 0" class="review-list">
        <div v-for="(review, index) in expert.reviews" :key="index" class="review-item">
          <p class="review-text">{{ review.text }}</p>
          <small class="review-date">{{ review.date }}</small>
        </div>
      </div>
      <p v-else class="no-reviews">Пока нет отзывов. Будьте первым!</p>
    </div>
    <!-- Кнопка жалобы -->
    <button @click="showComplaintModal" class="complaint-btn">
      ⚠️ Пожаловаться на собеседника
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'

const route = useRoute()
const router = useRouter()

const expert = ref(null)
const loading = ref(true)
const newRating = ref(0)
const newReview = ref('')
const reviewError = ref('')
const currentRating = ref(0)
const hoverRating = ref(0)
const ratingStats = ref(null)

// SEO и мета теги
const seoTitle = computed(() => 
  expert.value ? `${expert.value.name} - Собеседник | ${expert.value.age} лет | от ${expert.value.price}₽/час` : 'Собеседник'
)

const seoDescription = computed(() => {
  if (!expert.value) return 'Профессиональный собеседник для практики общения'
  
  const characteristics = []
  if (expert.value.alwaysAvailable) characteristics.push('доступен 24/7')
  if (expert.value.adultTopics) characteristics.push('темы 18+')
  if (expert.value.noForbiddenTopics) characteristics.push('без ограничений тем')
  
  const charString = characteristics.length ? ` (${characteristics.join(', ')})` : ''
  
  return `${expert.value.name}, ${expert.value.age} лет - профессиональный собеседник от ${expert.value.price}₽/час. Рейтинг: ${expert.value.rating}/5${charString}. ${expert.value.about ? expert.value.about.slice(0, 100) + '...' : ''}`
})

// Устанавливаем SEO мета-теги
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'profile',
  ogUrl: () => `https://sobesednik-na-chas.ru/experts/${route.params.id}`,
  ogImage: computed(() => expert.value?.mainPhotoUrl ? `https://sobesednik-na-chas.ru${expert.value.mainPhotoUrl}` : ''),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: computed(() => expert.value?.mainPhotoUrl ? `https://sobesednik-na-chas.ru${expert.value.mainPhotoUrl}` : '')
})

// Структурированные данные для поисковых систем
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => expert.value ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": expert.value.name,
        "description": expert.value.about || `Профессиональный собеседник, ${expert.value.age} лет`,
        "image": expert.value.mainPhotoUrl ? `https://sobesednik-na-chas.ru${expert.value.mainPhotoUrl}` : undefined,
        "url": `https://sobesednik-na-chas.ru/experts/${route.params.id}`,
        "offers": {
          "@type": "Offer",
          "price": expert.value.price,
          "priceCurrency": "RUB",
          "availability": expert.value.availability === 'Свободен' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          "description": `Услуги собеседника от ${expert.value.price}₽ за час`
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": expert.value.rating,
          "ratingCount": expert.value.totalSessions || 1,
          "bestRating": 5,
          "worstRating": 1
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "url": expert.value.telegram ? `https://t.me/${expert.value.telegram.replace('@', '')}` : undefined
        }
      }) : '{}')
    }
  ]
})

// Лайтбокс состояния
const lightboxVisible = ref(false)
const currentLightboxIndex = ref(0)

// Видео модал состояния  
const videoModalVisible = ref(false)
const currentVideoUrl = ref('')
const complaintModalVisible = ref(false) // Состояние модального окна жалобы

// Показать модальное окно жалобы
const showComplaintModal = () => {
  complaintModalVisible.value = true
}

const hideComplaintModal = () => {
  complaintModalVisible.value = false
}
// Жалобы конец

//Раздел Другие мессенджеры
const getMessengerInfo = (url) => {
  if (!url) return { name: 'Ссылка', icon: '🔗', href: url }

  const lower = url.toLowerCase()
  if (lower.includes('vk.com')) return { name: 'VK', icon: '', href: url }
  if (lower.includes('t.me')) return { name: 'Telegram', icon: '📲', href: url }
  if (lower.includes('wa.me') || lower.includes('whatsapp.com')) return { name: 'WhatsApp', icon: '💚', href: url }
  if (lower.includes('instagram.com')) return { name: 'Instagram', icon: '📸', href: url }
  if (urlOrTag.includes('#')) return { name: 'Discord', icon: '💜', href: '#' }

  return { name: 'Ссылка', icon: '🔗', href: url }
}
const otherMessengersList = computed(() => {
  if (!expert.value?.otherMessengers) return []

  try {
    // Попробуем распарсить JSON или массив
    const parsed = JSON.parse(expert.value.otherMessengers)
    if (Array.isArray(parsed)) return parsed.map(url => url.trim())
  } catch {
    // Если просто строка, разделяем по запятым
    return expert.value.otherMessengers.split(',').map(url => url.trim())
  }
})


// Обрабатываем galleryUrls - может быть строкой или массивом
const galleryUrls = computed(() => {
  if (!expert.value?.galleryUrls) return []

  // Если galleryUrls это строка (JSON), парсим её
  if (typeof expert.value.galleryUrls === 'string') {
    try {
      return JSON.parse(expert.value.galleryUrls)
    } catch (error) {
      console.error('Ошибка парсинга galleryUrls:', error)
      return []
    }
  }

  // Если это уже массив, возвращаем как есть
  return expert.value.galleryUrls
})

const currentLightboxUrl = computed(() => {
  if (!galleryUrls.value.length) return ''
  return galleryUrls.value[currentLightboxIndex.value]
})

// Открыть модальное окно видео
const openVideoModal = (videoUrl) => {
  currentVideoUrl.value = videoUrl
  videoModalVisible.value = true
}

// Закрыть модальное окно видео
const closeVideoModal = () => {
  videoModalVisible.value = false
  currentVideoUrl.value = ''
  // Останавливаем все видео при закрытии
  setTimeout(() => {
    const videos = document.querySelectorAll('video')
    videos.forEach(v => v.pause())
  }, 100)
}



const openLightbox = (index) => {
  // Открываем лайтбокс только для изображений
  if (isImage(galleryUrls.value[index])) {
    currentLightboxIndex.value = index
    lightboxVisible.value = true
  }
}

const closeLightbox = () => {
  lightboxVisible.value = false
}

const nextImage = () => {
  if (!galleryUrls.value.length) return
  
  let nextIndex = currentLightboxIndex.value
  do {
    nextIndex = (nextIndex + 1) % galleryUrls.value.length
  } while (!isImage(galleryUrls.value[nextIndex]) && nextIndex !== currentLightboxIndex.value)
  
  currentLightboxIndex.value = nextIndex
}

const prevImage = () => {
  if (!galleryUrls.value.length) return
  
  let prevIndex = currentLightboxIndex.value
  do {
    prevIndex = prevIndex === 0 ? galleryUrls.value.length - 1 : prevIndex - 1
  } while (!isImage(galleryUrls.value[prevIndex]) && prevIndex !== currentLightboxIndex.value)
  
  currentLightboxIndex.value = prevIndex
}



// Функция для получения правильного URL изображения
const getImageUrl = (url) => {
  const config = useRuntimeConfig() 
  if (!url) return null
  if (url.startsWith('http')) return url
  return config.public.fileBase + `${url}`
}

// Функция для проверки типа файла (изображение или видео)
const isImage = (url) => {
  if (!url) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  return imageExtensions.some(ext => url.toLowerCase().includes(ext))
}

// Функция для аватарки по умолчанию
const getDefaultAvatar = () => {
  // Используем data URL для простоты, можно заменить на путь к файлу в public
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ccircle cx='100' cy='80' r='40' fill='%23ccc'/%3E%3Ccircle cx='100' cy='180' r='60' fill='%23ccc'/%3E%3C/svg%3E"
}

// Вернуться на главную
const goBack = () => router.push('/')

// Получение данных эксперта с backend
const fetchExpert = async () => {
  loading.value = true
  const config = useRuntimeConfig() 

  try {
    
    const id = route.params.id
    const response = await $fetch(`${config.public.apiBase}/experts/${id}`)
    expert.value = response

    // Инициализируем reviews если их нет
    if (!expert.value.reviews) {
      expert.value.reviews = []
    }

    newRating.value = expert.value.rating || 0

    console.log('✅ Данные эксперта загружены:', expert.value)
    console.log('📸 Главное фото URL:', expert.value.mainPhotoUrl)
    console.log('💬 Отзывы:', expert.value.reviews)
    console.log('🖼️ Галерея URLs:', expert.value.galleryUrls)
  } catch (err) {
    console.error('❌ Ошибка загрузки данных эксперта:', err)
    expert.value = null
  } finally {
    loading.value = false
  }
}

// Получаем класс для отображения частично заполненных звезд
const getStarClass = (star) => {
  if (!expert.value) return ''

  const rating = expert.value.rating
  const fullStars = Math.floor(rating)
  const partialStar = rating - fullStars

  if (star <= fullStars) {
    return 'full'
  } else if (star === fullStars + 1 && partialStar > 0) {
    return 'partial'
  } else {
    return 'empty'
  }
}

// Получаем процент для статистики
const getPercentage = (star) => {
  if (!ratingStats.value || ratingStats.value.count === 0) return 0
  const count = ratingStats.value.distribution[star] || 0
  return (count / ratingStats.value.count) * 100
}

// Установка рейтинга
const setRating = async (star) => {
  if (!expert.value) return
  const config = useRuntimeConfig() 
  try {
    const response = await $fetch(`${config.public.apiBase}/experts/${expert.value.id}/rating`, {
      method: 'POST',
      body: {
        rating: star
      }
    })

    // Обновляем локальные данные
    expert.value.rating = response.rating
    expert.value.ratingCount = response.ratingCount
    if (expert.value.ratings) {
      expert.value.ratings.push(star)
    } else {
      expert.value.ratings = [star]
    }

    currentRating.value = star
    await fetchRatingStats()

    console.log('✅ Оценка добавлена:', response)
  } catch (error) {
    console.error('❌ Ошибка добавления оценки:', error)
  }
}

// Загрузка статистики рейтинга
const fetchRatingStats = async () => {
  if (!expert.value) return
  const config = useRuntimeConfig() 
  try {
    const response = await $fetch(`${config.public.apiBase}/experts/${expert.value.id}/rating/stats`)
    ratingStats.value = response
  } catch (error) {
    console.error('❌ Ошибка загрузки статистики:', error)
  }
}


// Добавление отзыва
// Валидация отзыва
const validateReview = (text) => {
  if (!text.trim()) {
    return 'Отзыв не может быть пустым'
  }
  if (text.trim().length < 6) {
    return 'Отзыв должен содержать не менее 6 символов'
  }
  if (text.trim().length > 500) {
    return 'Отзыв не должен превышать 500 символов'
  }
  return ''
}


const addReview = async () => {
  if (!expert.value) return

  // Валидируем отзыв
  const error = validateReview(newReview.value)
  if (error) {
    reviewError.value = error
    return
  }

  // Сбрасываем ошибку
  reviewError.value = ''

  const review = {
    text: newReview.value.trim(),
    date: new Date().toLocaleString()
  }
  const config = useRuntimeConfig() 
  try {
    await $fetch(`${config.public.apiBase}/experts/${expert.value.id}/reviews`, {
      method: 'POST',
      body: review
    })

    expert.value.reviews = expert.value.reviews || []
    expert.value.reviews.push(review)
    newReview.value = ''
  } catch (error) {
    console.error('❌ Ошибка добавления отзыва:', error)
    reviewError.value = 'Не удалось добавить отзыв. Попробуйте снова.'
  }
}

// Сброс ошибки при изменении текста
const handleReviewInput = () => {
  if (reviewError.value) {
    reviewError.value = ''
  }
}
// Добавление отзыва. Конец

// Логика для перехода в Telegram и отправки уведомления эксперту
const getTelegramLink = (username) => {
  const clean = username.replace('@', '').trim()
  return `https://t.me/${clean}`
}

const handleTelegramClick = async () => {
  if (!expert.value?.telegram) return
  const config = useRuntimeConfig() 
  try {
    await $fetch(`${config.public.apiBase}/experts/${expert.value.id}/notify`, {
      method: 'POST',
      body: { message: 'Пользователь перешёл в Telegram-чат эксперта с сайта "Собеседник на час"' },
    })
  } catch (err) {
    console.error('❌ Ошибка при отправке уведомления эксперту:', err)
  }

  // После отправки уведомления — открываем Telegram
  const url = getTelegramLink(expert.value.telegram)
  window.open(url, '_blank')
}

onMounted(fetchExpert)
</script>

<style scoped>
.expert-detail {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  background-color: rgba(145, 173, 250, 0.1);
}

.back-btn {
  background: none;
  border: none;
  color: #0077ff;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
  padding: 8px 16px;
  border: 1px solid #0077ff;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #0077ff;
  color: white;
}

.notice {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  color: #1565c0;
}

.main-info {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  align-items: flex-start;
}

/* verified */
.tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.tag-is-verified {
  background-color: #ca9c02;
  color: white;
}

.main-photo {
  width: 300px;
  height: 300px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.details {
  flex: 1;
}

.details h1 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 2rem;
}

.details p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  line-height: 1.5;
}

.details strong {
  color: #34495e;
}

.other-messengers {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.other-messenger-link {
  display: inline-block;
  padding: 6px 12px;
  background: #f0f0f0;
  border-radius: 6px;
  color: #0077ff;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.other-messenger-link:hover {
  background: #0077ff;
  color: white;
}


/* Характеристики эксперта */
.expert-characteristics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 1.5rem 0;
}

.char-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.char-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.char-available {
  background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
  color: white;
}

.char-adult {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.char-no-forbidden {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
}

.about-section {
  max-width: 100%;
  margin: 2rem auto;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.about-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #2c3e50;
}

.about-section p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #555;
  white-space: pre-line;
}


.gallery {
  margin: 3rem 0;
  padding: 2rem 0;
  border-top: 1px solid #e0e0e0;
}

.gallery h3 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.gallery-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.gallery-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.gallery-item img,
.gallery-item video {
  width: 100%;
  height: 200px;
  object-fit: contain;
  border-radius: 8px;
}

/* Стили для лайтбокса */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Стили для видео модала */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.video-modal-content {
  position: relative;
  width: 90%;
  max-width: 800px;
  max-height: 90%;
}

.modal-video {
  width: 100%;
  height: auto;
  max-height: 70vh;
  border-radius: 8px;
}

.video-modal-close {
  position: absolute;
  top: -50px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  z-index: 1002;
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.lightbox-close {
  position: absolute;
  top: -50px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  z-index: 1001;
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(36, 36, 36, 0.2);
  border: none;
  color: white;
  font-size: 28px;
  padding: 15px 20px;
  cursor: pointer;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-media {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-media img,
.lightbox-media video {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.rating-section {
  margin: 3rem 0;
  padding: 2rem 0;
  border-top: 1px solid #e0e0e0;
}

.rating-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.stars {
  font-size: 2.5rem;
  color: #ccc;
  cursor: pointer;
  margin-bottom: 1rem;
}

.star {
  margin: 0 5px;
  transition: color 0.2s ease;
}

.star:hover {
  color: #ffd700;
}

.star.active {
  color: #ffd700;
}

.rating-section p {
  font-size: 1.1rem;
  color: #666;
}

/* ==========================================================
   📱 АДАПТИВНОСТЬ
   ========================================================== */

/* === Маленькие смартфоны (до 375px) === */
@media (max-width: 375px) {
  .expert-detail {
    padding: 0.5rem;
  }

  .back-btn {
    font-size: 13px;
    padding: 6px 12px;
    margin-bottom: 12px;
  }

  .notice {
    font-size: 13px;
    padding: 10px;
    margin-bottom: 15px;
  }

  .main-info {
    flex-direction: column;
    gap: 1rem;
  }

  .main-photo {
    width: 100%;
    max-width: 100%;
    height: auto;
    aspect-ratio: 1;
    margin: 0;
  }

  .details h1 {
    font-size: 1.3rem;
  }

  .details p {
    font-size: 14px;
    margin: 6px 0;
  }

  .about-section {
    padding: 12px;
  }

  .about-section h3 {
    font-size: 1.1rem;
  }

  .about-section p {
    font-size: 14px;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .gallery-item img,
  .gallery-item video {
    height: 120px;
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
    font-size: 20px;
    padding: 8px;
  }

  .lightbox-prev {
    left: 5px;
  }

  .lightbox-next {
    right: 5px;
  }

  .lightbox-close {
    font-size: 32px;
    padding: 8px 12px;
  }

  .rating-section h3,
  .reviews h3 {
    font-size: 1.2rem;
  }

  .stars {
    font-size: 1.8rem;
  }

  .reviews textarea {
    font-size: 14px;
    padding: 10px;
  }

  .reviews button {
    width: 100%;
    padding: 10px;
    font-size: 15px;
  }
}

/* === Обычные смартфоны (376px - 480px) === */
@media (min-width: 376px) and (max-width: 480px) {
  .expert-detail {
    padding: 0.75rem;
  }

  .notice {
    font-size: 14px;
    padding: 12px;
  }

  .main-info {
    flex-direction: column;
    gap: 1.5rem;
  }

  .main-photo {
    width: 100%;
    max-width: 350px;
    height: auto;
    aspect-ratio: 1;
    margin: 0 auto;
  }

  .details h1 {
    font-size: 1.5rem;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .gallery-item img,
  .gallery-item video {
    height: 140px;
  }

  .stars {
    font-size: 2rem;
  }

  .lightbox-nav {
    width: 45px;
    height: 45px;
    font-size: 22px;
  }
}

/* === Планшеты (481px - 768px) === */
@media (min-width: 481px) and (max-width: 768px) {
  .expert-detail {
    padding: 1rem;
  }

  .main-info {
    flex-direction: column;
    gap: 1.5rem;
  }

  .main-photo {
    width: 100%;
    max-width: 400px;
    height: 400px;
    margin: 0 auto;
  }

  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .gallery-item img,
  .gallery-item video {
    height: 160px;
  }

  .lightbox-nav {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }

  .lightbox-prev {
    left: 10px;
  }

  .lightbox-next {
    right: 10px;
  }
}

/* === Ноутбуки (769px - 1024px) === */
@media (min-width: 769px) and (max-width: 1024px) {
  .expert-detail {
    padding: 1.5rem;
  }

  .main-info {
    flex-direction: row;
    gap: 2rem;
  }

  .main-photo {
    width: 350px;
    height: 350px;
  }

  .gallery-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
  }

  .gallery-item img,
  .gallery-item video {
    height: 180px;
  }
}

/* Стили для кнопки жалобы */
.complaint-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-top: 1rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.complaint-btn:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* Модальное окно жалобы */
.complaint-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.complaint-modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: modalAppear 0.3s ease;
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.complaint-close {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 5px;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.complaint-close:hover {
  background: #f5f5f5;
  color: #333;
}

.complaint-modal-content h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.complaint-modal-content p {
  margin: 0.5rem 0;
  line-height: 1.5;
  color: #555;
}

.complaint-email {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  margin: 1rem 0;
  border: 2px solid #e9ecef;
}

.complaint-email strong {
  color: #e74c3c;
  font-size: 1.1rem;
  word-break: break-all;
}

.complaint-note {
  font-size: 0.9rem;
  color: #7f8c8d;
  font-style: italic;
}

.complaint-confirm-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.complaint-confirm-btn:hover {
  background: #2980b9;
  transform: translateY(-1px);
}


/* === Десктоп (1025px+) === */
@media (min-width: 1025px) {
  .expert-detail {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .main-info {
    flex-direction: row;
    gap: 2.5rem;
  }

  .main-photo {
    width: 400px;
    height: 400px;
  }

  .gallery-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .gallery-item img,
  .gallery-item video {
    height: 200px;
  }
}

/* Общие стили для ссылки Telegram */
.telegram-link {
  color: #0088cc;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.3s ease;
}

.telegram-link:hover {
  color: #6f42c1;
  text-decoration: underline;
}

/* Стили для отзывов */
.reviews {
  margin-top: 2rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 12px;
}

.reviews h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.5rem;
}

.reviews textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;
}

.reviews textarea:focus {
  outline: none;
  border-color: #6f42c1;
  box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.1);
}

.reviews button {
  background: linear-gradient(135deg, #6f42c1, #8b5cf6);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.reviews button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
}

.reviews button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.review-list {
  margin-top: 2rem;
}

.review-item {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.review-text {
  color: #333;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.review-date {
  color: #999;
  font-size: 0.85rem;
}

.no-reviews {
  text-align: center;
  color: #999;
  margin-top: 2rem;
  font-style: italic;
}

/* Стили для рейтинга */
/* Стили для отображения звезд с частичным заполнением */
.stars-display {
  font-size: 2.5rem;
  position: relative;
  display: inline-block;
}

.star-display {
  color: #ddd;
  position: relative;
  display: inline-block;
}

.star-display.full {
  color: #ffd700;
}

.star-display.partial {
  background: linear-gradient(90deg, #ffd700 var(--fill-percentage, 50%), #ddd var(--fill-percentage, 50%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.star-display.empty {
  color: #ddd;
}

/* Стили для ввода рейтинга */
.stars-input {
  font-size: 2.5rem;
  color: #ccc;
  cursor: pointer;
  margin-bottom: 1rem;
}

.star-input {
  margin: 0 5px;
  transition: color 0.2s ease;
}

.star-input:hover {
  color: #ffd700;
  transform: scale(1.2);
}

.star-input.active {
  color: #ffd700;
}

.star-input.hover {
  color: #ffed4a;
}

/* Стили для статистики */
.rating-stats {
  margin-top: 2rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.stats-bars {
  max-width: 300px;
}

.stat-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 10px;
}

.stat-star {
  width: 40px;
  font-weight: bold;
}

.stat-bar {
  flex: 1;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4a);
  transition: width 0.3s ease;
}

.stat-count {
  width: 30px;
  text-align: right;
  font-size: 0.9rem;
  color: #666;
}

.rating-text strong {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  
  text-align: end;
}

.selected-rating {
  color: #27ae60;
  font-weight: 500;
  margin-top: 0.5rem;
}

.rating-display {
  display: flex;
  align-items: center;
  text-align: center;

}

.rating-input {
  margin-top: 1rem;
  padding: .5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.star:hover {
  transform: scale(1.2);
  color: #ffd700;
}

.star.active {
  color: #ffd700;
}

.rating-section p {
  color: #666;
  font-weight: 600;
}

/* Стили для заголовка с рейтингом */
.rating-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0.5rem 0 1rem 0;
}

/* Стили для отображения звезд с контурами и частичным заполнением */
.stars-display {
  display: flex;
  gap: 2px;
}

.star-display {
  position: relative;
  display: inline-block;
  font-size: 1.8rem;
  color: #ddd;
  /* Цвет контура */
  -webkit-text-stroke: 1px #999;
  /* Контур для звезд */
 
}
.star-display .star-outline {
  text-shadow: 
    -1px -1px 0 #999,
     1px -1px 0 #999,
    -1px  1px 0 #999,
     1px  1px 0 #999;
  color: transparent;
}

.star-display .star-outline,
.star-display .star-fill {
  display: inline-block;
}

.star-display .star-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: transparent;
  background: linear-gradient(90deg, #ffd700 var(--fill-percentage, 0%), transparent var(--fill-percentage, 0%));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 0;
 
}

.star-display.full .star-fill {
  background: #ffd700;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.star-display.empty .star-fill {
  background: transparent;
}

@media (max-width: 480px) {
  .complaint-modal-content {
    padding: 1.5rem;
    margin: 1rem;
  }

  .complaint-btn {
    width: 100%;
    justify-content: center;
    font-size: 13px;
    padding: 12px;
  }

  .rating-header {
    gap: 8px;
  }

  .star-display {
    font-size: 1.5rem;
  }

  .rating-value {
    font-size: 1.2rem;
  }

  .stars-input {
    font-size: 1.8rem;
  }

}

@media (max-width: 375px) {
  .rating-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .star-display {
    font-size: 1.3rem;
  }

  .rating-value {
    font-size: 1.1rem;
  }
}
</style>