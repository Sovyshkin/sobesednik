<template>
  <div class="page-container">
    <div class="compact-hero">
      <div class="compact-hero-content">
        <p class="compact-hero-text">
         Собеседник на час&nbsp;&mdash; место, где каждый может найти искреннего друга, поддержку&nbsp;и&nbsp;понимание.
        </p>
      </div>
    </div>

    <!-- Поиск -->
    <div class="search-bar">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Поиск по имени, фамилии, логину, возрасту или Telegram..."
      />
    </div>
    <div class="top-bar">
  <!-- Сортировка -->
  <div class="sort-bar">
    <label>
      Сортировка:
      <select v-model="sortOption">
        <option value="">Без сортировки</option>
        <option
          v-for="option in sortOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>

  <!-- Кнопка раскрытия фильтров -->
  <button class="filter-toggle" @click="filtersOpen = !filtersOpen">
    Фильтры
    <span v-if="!filtersOpen">▼</span>
    <span v-else>▲</span>
  </button>
</div>

<!-- Сами фильтры, скрываем/открываем -->
<div class="filters" :class="{ open: filtersOpen }">
  <label><input type="checkbox" v-model="filters.male" /> Мужчины</label>
  <label><input type="checkbox" v-model="filters.female" /> Женщины</label>
  <label><input type="checkbox" v-model="filters.adultTopics" /> Есть темы 18+</label>
  <label><input type="checkbox" v-model="filters.noForbidden" /> Нет запрещённых тем</label>
  <label><input type="checkbox" v-model="filters.freeNow" /> Сейчас свободен</label>
  <label><input type="checkbox" v-model="filters.alwaysAvailable" /> 24/7</label>
  <label><input type="checkbox" v-model="filters.expertIsVerified" /> Подтверждённый собеседник</label>
</div>


    <h1>Собеседник на час</h1>

    <div v-if="store.loading">Загрузка...</div>
    <div v-else-if="sortedExperts.length === 0">Нет доступных собеседников</div>

    <!-- Список экспертов -->
    <div v-else class="experts-list">
      <ExpertCardMini
        v-for="expert in paginatedExperts"
        :key="expert.id"
        :expert="expert"
        @click="goToExpert(expert.id)"
      />
    </div>

    <!-- Кнопка "Показать ещё" -->
    <div v-if="hasMoreExperts && !infiniteScrollEnabled" class="show-more">
  <button @click="showMore" :disabled="isLoadingMore">
    {{ isLoadingMore ? 'Загрузка...' : 'Показать ещё' }}
  </button>
</div>


    <!-- Нумерация страниц -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        v-for="page in totalPages"
        :key="page"
        @click="goToPage(page)"
        :class="{ active: page === currentPage }"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useExpertsStore } from '~/stores/expertsStore'
import { useRouter } from 'vue-router'

const store = useExpertsStore()
const router = useRouter()

// SEO для главной страницы
useSeoMeta({
  title: 'Собеседник на час - Найдите идеального собеседника для общения',
  description: 'Профессиональные собеседники для доверительного общения. Выберите эксперта по возрасту, полу, интересам и стоимости. Доступны 24/7, темы 18+, без ограничений.',
  keywords: 'собеседник, общение, психология, поддержка, разговор, онлайн, консультация',
  ogTitle: 'Собеседник на час - Профессиональное общение',
  ogDescription: 'Найдите идеального собеседника для доверительного общения. Профессиональные эксперты готовы выслушать и поддержать.',
  ogType: 'website',
  ogUrl: 'https://sobesednik-na-chas.ru',
  ogImage: '/images/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Собеседник на час - Профессиональное общение',
  twitterDescription: 'Найдите идеального собеседника для доверительного общения',
  twitterImage: '/images/twitter-image.jpg'
})

// Структурированные данные для главной страницы
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Собеседник на час",
        "description": "Платформа для поиска профессиональных собеседников",
        "url": "https://sobesednik-na-chas.ru",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://sobesednik-na-chas.ru?search={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        },
        "provider": {
          "@type": "Organization",
          "name": "Собеседник на час",
          "url": "https://sobesednik-na-chas.ru"
        }
      })
    }
  ]
})

// состояние
const searchQuery = ref('')
const filters = ref({
  male: false,
  female: false,
  adultTopics: false,
  noForbidden: false,
  freeNow: false,
  alwaysAvailable: false,
  expertIsVerified: false,
})
const expertsPerPage = 10
const currentPage = ref(1)
const isLoadingMore = ref(false)

// фильтрация
const filtersOpen = ref(false)  // состояние открытия фильтров

const filteredExperts = computed(() => {
  return store.experts.filter(expert => {
    if (expert.status === 'pending') return false
    if (expert.status === 'expired') return false // Исключаем истекшие анкеты из поиска

    const query = searchQuery.value.toLowerCase()
    const fullName = `${expert.name || ''} ${expert.surname || ''}`.toLowerCase()
    const login = (expert.login || '').toLowerCase()
    const age = expert.age ? expert.age.toString() : ''
    const telegram = (expert.telegram || '').toLowerCase()

    const matchesSearch =
      fullName.includes(query) ||
      login.includes(query) ||
      age.includes(query) ||
      telegram.includes(query)

    if (!matchesSearch) return false
    if (filters.value.male && expert.gender !== 'male') return false
    if (filters.value.female && expert.gender !== 'female') return false
    if (filters.value.adultTopics && !expert.adultTopics) return false
    if (filters.value.noForbidden && !expert.noForbiddenTopics) return false
    if (filters.value.freeNow && expert.availability !== 'Свободен') return false
    if (filters.value.alwaysAvailable && !expert.alwaysAvailable) return false
    if (filters.value.expertIsVerified && !expert.expertIsVerified) return false

    return true
  })
})

const sortOption = ref('') // текущая сортировка: '', 'rating', 'reviews', 'new', 'old'

const sortOptions = [
  { label: 'Высокий рейтинг', value: 'rating' },
  { label: 'Количество отзывов', value: 'reviews' },
  { label: 'Сначала новые', value: 'new' },
  { label: 'Сначала старые', value: 'old' }
]

const sortedExperts = computed(() => {
  // создаём копию массива, чтобы не мутировать store.experts
  const experts = [...filteredExperts.value]

  switch (sortOption.value) {
    case 'rating':
      return experts.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'reviews':
      return experts.sort((a, b) => {
        // Используем reviewsCount если он есть, иначе считаем длину массива reviews
        const reviewsCountA = a.reviewsCount || (Array.isArray(a.reviews) ? a.reviews.length : 0)
        const reviewsCountB = b.reviewsCount || (Array.isArray(b.reviews) ? b.reviews.length : 0)
        return reviewsCountB - reviewsCountA // от большего к меньшему
      })
    case 'new':
      return experts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    case 'old':
      return experts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    default:
      return experts
  }
})

// страничная логика
const totalPages = computed(() => Math.ceil(sortedExperts.value.length / expertsPerPage))
const paginatedExperts = computed(() => sortedExperts.value.slice(0, currentPage.value * expertsPerPage))
const hasMoreExperts = computed(() => paginatedExperts.value.length < sortedExperts.value.length)
const infiniteScrollEnabled = ref(false)

function showMore() {
  if (!hasMoreExperts.value) return
  isLoadingMore.value = true

  setTimeout(() => {
    currentPage.value++

    // Включаем бесконечный скролл после первого клика
    infiniteScrollEnabled.value = true

    isLoadingMore.value = false
  }, 600)
}


function goToPage(page) {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleScroll() {
  if (!infiniteScrollEnabled.value) return

  const scrollTop = window.scrollY
  const clientHeight = window.innerHeight
  const scrollHeight = document.documentElement.scrollHeight

  if (
    scrollTop + clientHeight >= scrollHeight - 200 &&
    hasMoreExperts.value &&
    !isLoadingMore.value
  ) {
    isLoadingMore.value = true
    setTimeout(() => {
      currentPage.value++
      isLoadingMore.value = false
    }, 600)
  }
}



onMounted(async () => {
  console.log('🏠 Главная страница загружена');
  console.log(`📊 Экспертов в store ДО синхронизации: ${store.experts.length}`);
  
  if (store.experts.length > 0) {
    console.log('📋 Первый эксперт:', store.experts[0]);
  }
  
  await store.syncWithServer()
  
  console.log(`📊 Экспертов в store ПОСЛЕ синхронизации: ${store.experts.length}`);
  
  if (store.experts.length > 0) {
    console.log('📋 Первый эксперт после синхронизации:', store.experts[0]);
  }
})

// при изменении фильтров или поиска — сброс страницы
watch([searchQuery, filters], () => {
  currentPage.value = 1
})

const goToExpert = (id) => router.push(`/experts/${id}`)

// Бесконечный скролл
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// SEO block
useHead({
  title: 'Найдите понимающего собеседника онлайн | Собеседник на час',

  meta: [
    { 
      name: 'description', 
      content: 'Сервис подбора проверенных собеседников для душевной беседы. Общайтесь анонимно по аудио, видео или в чате на любые темы. Выговоритесь и получите поддержку.' 
    },
    { property: 'og:title', content: 'Собеседник на час — приватное общение с понимающим человеком' },
    { property: 'og:description', content: 'Вы не одны. Найдите собеседника, который готов выслушать и поддержать.' },
    { property: 'og:image', content: 'https://sobesednik-na-chas.ru/images/og-main.jpg' },
    { property: 'og:url', content: 'https://sobesednik-na-chas.ru/' },
    { property: 'og:type', content: 'website' },
    { property: 'og:locale', content: 'ru_RU' },
    { property: 'og:site_name', content: 'Собеседник на час' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Найдите понимающего собеседника онлайн | Собеседник на час' },
    { name: 'twitter:description', content: 'Анонимные доверительные беседы с понимающими собеседниками.' },
    { name: 'twitter:image', content: 'https://sobesednik-na-chas.ru/images/twitter-main.jpg' },
    { name: 'robots', content: 'index, follow, max-image-preview:large' },
    { name: 'keywords', content: 'собеседник, поговорить, поддержка, слушатель, доверительная беседа, анонимный разговор, онлайн общение' },
    { name: 'yandex-verification', content: '593746f54fd88b0d' }
  ],

  link: [
    { rel: 'canonical', href: 'https://sobesednik-na-chas.ru/' },
    { rel: 'preload', as: 'image', href: 'https://sobesednik-na-chas.ru/images/og-main.jpg', fetchpriority: 'high' }
  ],  

  htmlAttrs: {
    lang: 'ru'
  }
})

</script>

<style scoped>
.page-container {
  padding: 0 16px 40px;
  max-width: 1600px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* .page-container {
  height: 100vh;
  overflow-y: auto;
} */

/* ---------- Фон и шрифт ---------- */
body {
  background: linear-gradient(to bottom, #87ceeb 0%, #fceabb 70%, #f7e7c7 100%);
  background-attachment: fixed;
  font-family: "Inter", "Arial", sans-serif;
  color: #222;
}

/* ---------- Hero ---------- */
.compact-hero {
  background: linear-gradient(135deg, #8394e0 0%, #8666a7 100%);
  color: white;
  padding: clamp(16px, 4vw, 32px);
  margin-bottom: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.compact-hero-text {
  font-size: clamp(1rem, 2vw, 1.4rem);
  line-height: 1.5;
  font-weight: 500;
  max-width: 800px;
  margin: 0 auto;
}

/* ---------- Поиск ---------- */
.search-bar {
  margin: 20px 0;
  text-align: center;
}
.search-bar input {
  width: 100%;
  max-width: 400px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  transition: 0.2s;
}
.search-bar input:focus {
  border-color: #667eea;
  outline: none;
}

/* ---------- Фильтры ---------- */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}
.filters label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  background: #f7f7fa;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.filters label:hover {
  background: #eee;
}

/* Верхняя панель: сортировка + кнопка фильтров */
.top-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin: 10px 0 10px;
  flex-wrap: wrap;
}

.filter-toggle {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s;
}

.filter-toggle:hover {
  background: #556cd6;
}

/* Скрывающиеся фильтры */
/* Плавное раскрытие и скрытие фильтров */
.filters {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 1s ease;
}

/* Когда фильтры открыты */
.filters.open {
  max-height: 500px; /* достаточно для всех фильтров */
  opacity: 1;
}


/* ---------- Сетка карточек ---------- */
.experts-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 16px;
  margin-top: 20px;
}

/* ---------- Кнопка "Показать ещё" ---------- */
.show-more {
  text-align: center;
  margin-top: 20px;
}
.show-more button {
  padding: 10px 18px;
  background-color: #667eea;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.3s;
}
.show-more button:hover {
  background-color: #556cd6;
}
.show-more button:disabled {
  opacity: 0.7;
  cursor: default;
}

/* ---------- Пагинация ---------- */
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
  flex-wrap: wrap;
}
.pagination button {
  background: #f0f0f0;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: 0.3s;
}
.pagination button:hover {
  background: #dcdcdc;
}
.pagination button.active {
  background: #667eea;
  color: white;
}

/* .sort-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin: 15px 0 20px;
  flex-wrap: wrap;
  
} */
.sort-bar select {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #6a50fc;
  font-size: 14px;
}


/* ==========================================================
   📱 АДАПТИВНОСТЬ
   ========================================================== */

/* === 320px — маленькие смартфоны === */
@media (max-width: 375px) {
  .page-container {
    padding: 0 8px 30px;
  }

  .compact-hero {
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 8px;
  }
  
  .compact-hero-text {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  h1 {
    font-size: 1.3rem;
    text-align: center;
  }

  .search-bar input {
    font-size: 14px;
    padding: 8px 12px;
  }

  .sort-bar {
    margin: 8px 0 15px;
  }

  .sort-bar select {
    font-size: 13px;
    padding: 5px 8px;
  }

  .filters {
    gap: 6px;
    margin-bottom: 15px;
  }
  
  .filters label {
    font-size: 12px;
    padding: 5px 8px;
  }

  .experts-list {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .pagination button {
    padding: 5px 10px;
    font-size: 13px;
  }
}

/* === 480px — обычные смартфоны === */
@media (min-width: 376px) and (max-width: 480px) {
  .page-container {
    padding: 0 12px 35px;
  }

  .compact-hero {
    padding: 16px;
  }

  h1 {
    font-size: 1.5rem;
    text-align: center;
  }

  .experts-list {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .filters {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    padding-bottom: 5px;
  }

  .filters::-webkit-scrollbar {
    height: 4px;
  }

  .filters::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
}

/* === 768px — планшеты === */
@media (min-width: 481px) and (max-width: 768px) {
  .page-container {
    padding: 0 16px 40px;
  }

  .compact-hero {
    padding: 20px;
  }

  h1 {
    font-size: 1.8rem;
    text-align: center;
  }

  .search-bar input {
    max-width: 500px;
  }

  .experts-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .filters {
    gap: 10px;
  }
}

/* === 1024px — ноутбуки === */
@media (min-width: 769px) and (max-width: 1024px) {
  .experts-list {
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  
  .filters {
    justify-content: center;
  }

  .compact-hero {
    padding: 24px;
  }
}

/* === 1440px — стандартные мониторы === */
@media (min-width: 1025px) and (max-width: 1440px) {
  .experts-list {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .page-container {
    max-width: 1400px;
  }
}

/* === 1920px+ — большие мониторы === */
@media (min-width: 1441px) {
  .experts-list {
    grid-template-columns: repeat(5, 1fr);
    gap: 22px;
  }
  
  .page-container {
    max-width: 1600px;
  }

  .compact-hero {
    padding: 32px;
  }
}
</style>

