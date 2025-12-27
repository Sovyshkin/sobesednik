<template>
  <div class="admin-panel">
    <!-- Хедер с кнопкой выхода -->
    <div class="admin-header">
      <div class="header-content">
        <h1>Панель администратора</h1>
        <p>Управление анкетами собеседников</p>
      </div>
      <div class="header-actions">
        <span class="admin-info">Вход: conversation_admin</span>
        <button @click="handleLogout" class="logout-btn">
          🚪 Выйти
        </button>
      </div>
    </div>
    <!-- Поиск -->
    <div class="search-group">
      <input type="text" v-model="searchQuery" placeholder="Поиск по имени, логину или Telegram..."
        class="search-input" />
    </div>


    <!-- Фильтры -->
    <div class="filters">
      <div class="filter-group">
        <label>Статус анкет:</label>
        <select v-model="statusFilter" @change="filterExperts" class="filter-select">
          <option value="">Все статусы</option>
          <option value="pending">Ожидают оплаты</option>
          <option value="active">Активные</option>
          <option value="draft">Черновики</option>
          <option value="expired">Истекшие</option>
          <option value="rejected">Отклоненные</option>
        </select>
      </div>

      <button @click="refreshData" class="refresh-btn">
        🔄 Обновить данные
      </button>
    </div>

    <!-- Статистика -->
    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <h3>Всего анкет</h3>
          <p class="stat-number">{{ experts.length }}</p>
        </div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <h3>Ожидают оплаты</h3>
          <p class="stat-number">{{ pendingCount }}</p>
        </div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <h3>Активные</h3>
          <p class="stat-number">{{ activeCount }}</p>
        </div>
      </div>
    </div>

    <!-- Список экспертов -->
    <div class="experts-list">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка данных...</p>
      </div>

      <div v-else-if="filteredExperts.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Нет анкет с выбранным фильтром</h3>
        <p>Попробуйте изменить параметры фильтрации</p>
      </div>

      <div v-else class="expert-cards">
        <div v-for="expert in filteredExperts" :key="expert.id" class="expert-card" :class="expert.status">
          <div class="expert-header">
            <h3>{{ expert.name }}</h3>
            <span :class="`status-badge status-${expert.status}`">
              {{ getStatusText(expert.status) }}
            </span>
          </div>

          <div class="expert-info">
            <div class="info-row">
              <span class="info-label">Логин:</span>
              <span class="info-value">{{ expert.login }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Телеграм:</span>
              <span class="info-value">{{ expert.telegram || 'не указан' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Код оплаты:</span>
              <span class="info-value payment-code">{{ expert.paymentCode || 'нет' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Срок публикации:</span>
              <span class="info-value">{{ getDaysLeft(expert.expiresAt) }} дней</span>
            </div>
            <div class="info-row">
              <span class="info-label">Сумма оплаты:</span>
              <span class="info-value price">{{ expert.paymentAmount || 0 }} руб.</span>
            </div>
            <div class="info-row">
              <span class="info-label">Создано:</span>
              <span class="info-value">{{ formatDate(expert.createdAt) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Цена:</span>
              <span class="info-value price">{{ expert.price }} руб/час</span>
            </div>
            <div class="info-row">
              <span class="info-label">Темы 18+:</span>
              <span class="info-value" :class="expert.adultTopics ? 'yes' : 'no'">
                {{ expert.adultTopics ? 'Да' : 'Нет' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Запрещенных тем нет:</span>
              <span class="info-value" :class="expert.noForbiddenTopics ? 'yes' : 'no'">
                {{ expert.noForbiddenTopics ? 'Да' : 'Нет' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Готов откликаться 24/7:</span>
              <span class="info-value" :class="expert.alwaysAvailable ? 'yes' : 'no'">
                {{ expert.alwaysAvailable ? 'Да' : 'Нет' }}
              </span>
            </div>
          </div>

          <div v-if="extendExpertId === expert.id" class="modal-extend-publication">
            <div class="modal-publication">
              <h3>Продлить публикацию</h3>
              <span class="info-value">{{ expert.telegram || 'не указан' }}</span>
              <span class="info-value">{{ expert.login }}</span>
              <label>
                Количество дней
                <input type="number" min="1" v-model.number="extendDays" />
              </label>

              <div class="modal-publication-actions">
                <button
                :disabled="extendLoading"
                 @click="confirmExtendPublication"
                >Подтвердить</button>
                <button @click="closeExtendModal">Отменить</button>
              </div>
            </div>
          </div>

          <div class="admin-actions">
            <button v-if="expert.status === 'pending'" @click="approveExpert(expert.id)" class="action-btn approve-btn"
              title="Одобрить анкету">
              ✅ Одобрить
            </button>
            <button @click="openExtendModal(expert.id)" class="action-btn extend-publicationt-btn"
              title="Продлить публикацию">
              Продлить
            </button>
            <button v-if="expert.status === 'pending'" @click="rejectExpert(expert.id)" class="action-btn reject-btn"
              title="Отклонить анкету">
              ❌ Отклонить
            </button>
            <button v-if="expert.telegram" @click="contactExpert(expert)" class="action-btn contact-btn"
              title="Связаться в Telegram">
              📞 Связаться
            </button>
            <button @click="viewDetails(expert.id)" class="action-btn details-btn" title="Посмотреть детали">
              👁️ Подробнее
            </button>
            <button v-if="expert.status !== 'blocked'" @click="blockExpert(expert.id)" class="action-btn block-btn"
              title="Заблокировать анкету">
              🚫 Заблокировать
            </button>

            <button @click="deleteExpert(expert.id)" class="action-btn delete-btn" title="Удалить анкету">
              🗑️ Удалить
            </button>
            <button v-if="!expert.expertIsVerified" @click="verifyExpert(expert.id)" class="action-btn verify-btn"
              title="Подтвердить через онлайн-встречу">
              🛡️ Вериф
            </button>

            <button v-else @click="unverifyExpert(expert.id)" class="action-btn unverify-btn" title="Снять верификацию">
              ⚠️ Снять вериф
            </button>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from '#app'

const router = useRouter()

// Данные
const experts = ref([])
const loading = ref(false)
const statusFilter = ref('pending')
const searchQuery = ref('')

// Модальное окно продления публикации
const extendDays = ref(1)
const extendExpertId = ref(null)
const extendLoading = ref(false)


// Загрузка экспертов
const loadExperts = async () => {
  loading.value = true
  const config = useRuntimeConfig()
  try {
    // Пробуем использовать специальный endpoint для админа
    console.log('🔄 Попытка загрузить данные через /experts/admin/all...');
    let response;

    try {
      response = await $fetch(`${config.public.apiBase}/experts/admin/all`)
      console.log('✅ Данные загружены через admin endpoint');
    } catch (adminError) {
      console.warn('⚠️ Admin endpoint недоступен, используем fallback:', adminError.message);
      console.log('🔄 Загрузка через обычный endpoint /experts...');

      // Fallback: используем обычный endpoint (но он вернет только активных)
      // ВРЕМЕННОЕ РЕШЕНИЕ: Нужно перезапустить бэкенд для работы admin endpoint
      response = await $fetch(`${config.public.apiBase}/experts`)

      alert('⚠️ ВНИМАНИЕ: Бэкенд нужно перезапустить!\nСейчас показаны только активные анкеты.\nПерезапустите backend командой: npm run start:dev')
    }

    // Проверяем, что response - это массив
    if (!Array.isArray(response)) {
      console.error('❌ Ответ сервера не является массивом:', response);
      experts.value = [];
      alert('Ошибка: сервер вернул некорректные данные');
      return;
    }

    experts.value = response
    console.log('✅ Загружено экспертов:', experts.value.length)

    // Отладочная информация
    if (experts.value.length > 0) {
      console.log('📋 Пример данных эксперта:', {
        id: experts.value[0].id,
        login: experts.value[0].login,
        status: experts.value[0].status,
        adminVerified: experts.value[0].adminVerified,
        paymentCode: experts.value[0].paymentCode,
        publicationDays: experts.value[0].publicationDays,
        paymentAmount: experts.value[0].paymentAmount,
        createdAt: experts.value[0].createdAt,
        updatedAt: experts.value[0].updatedAt
      })
    } else {
      console.log('ℹ️ Нет экспертов в базе данных')
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки экспертов:', error)
    experts.value = [] // Устанавливаем пустой массив при ошибке
    alert('Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка'))
  } finally {
    loading.value = false
  }
}

// Фильтрация
// const filteredExperts = computed(() => {
//   if (!statusFilter.value) return experts.value
//   return experts.value.filter(expert => expert.status === statusFilter.value)
// })

// Поиск и фильтрация
const filteredExperts = computed(() => {
  // Проверка, что experts.value - это массив
  if (!Array.isArray(experts.value)) {
    console.warn('⚠️ experts.value не является массивом:', experts.value);
    return [];
  }

  return experts.value.filter(expert => {
    const matchesStatus = !statusFilter.value || expert.status === statusFilter.value
    const query = searchQuery.value.toLowerCase().trim()
    const matchesSearch =
      !query ||
      expert.name?.toLowerCase().includes(query) ||
      expert.login?.toLowerCase().includes(query) ||
      expert.telegram?.toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })
})

// Статистика
const pendingCount = computed(() => {
  if (!Array.isArray(experts.value)) return 0;
  return experts.value.filter(e => e.status === 'pending').length;
})
const activeCount = computed(() => {
  if (!Array.isArray(experts.value)) return 0;
  return experts.value.filter(e => e.status === 'active').length;
})

// Действия администратора
const approveExpert = async (expertId) => {
  if (!confirm('Вы уверены, что хотите одобрить эту анкету?')) return
  const config = useRuntimeConfig()
  try {
    console.log('✅ Одобрение эксперта:', expertId)

    const response = await $fetch(`${config.public.apiBase}/experts/admin/${expertId}/approve`, {
      method: 'POST'
    })

    console.log('✅ Ответ от сервера:', response)

    // Обновляем локальные данные
    const index = experts.value.findIndex(e => e.id === expertId)
    if (index !== -1) {
      experts.value[index] = { ...experts.value[index], ...response }
    }

    alert('Анкета одобрена и опубликована!')
  } catch (error) {
    console.error('❌ Ошибка одобрения:', error)
    alert('Ошибка при одобрении анкеты: ' + error.data?.message || error.message)
  }
}


const rejectExpert = async (expertId) => {
  const reason = prompt('Укажите причину отклонения:')
  if (!reason) return
  const config = useRuntimeConfig()
  try {
    console.log('❌ Отклонение эксперта:', expertId, 'Причина:', reason)

    const response = await $fetch(`${config.public.apiBase}/experts/admin/${expertId}/reject`, {
      method: 'POST',
      body: { reason }
    })

    console.log('✅ Ответ от сервера:', response)

    // Обновляем локальные данные
    const index = experts.value.findIndex(e => e.id === expertId)
    if (index !== -1) {
      experts.value[index] = { ...experts.value[index], ...response }
    }

    alert('Анкета отклонена!')
  } catch (error) {
    console.error('❌ Ошибка отклонения:', error)
    alert('Ошибка при отклонении анкеты: ' + error.data?.message || error.message)
  }
}

const contactExpert = (expert) => {
  if (expert.telegram) {
    const telegramUrl = `https://t.me/${expert.telegram.replace('@', '')}`
    window.open(telegramUrl, '_blank')
  } else {
    alert('Telegram не указан')
  }
}

const viewDetails = (expertId) => {
  router.push(`/experts/${expertId}`)
}

// Блокировка анкеты
const blockExpert = async (expertId) => {
  if (!confirm('Вы уверены, что хотите заблокировать эту анкету?')) return
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.apiBase}/experts/admin/${expertId}/block`, {
      method: 'POST'
    })

    console.log('🚫 Анкета заблокирована:', response)

    const index = experts.value.findIndex(e => e.id === expertId)
    if (index !== -1) {
      experts.value[index] = { ...experts.value[index], status: 'blocked' }
    }

    alert('Анкета заблокирована!')
  } catch (error) {
    console.error('❌ Ошибка блокировки:', error)
    alert('Ошибка при блокировке анкеты: ' + (error.data?.message || error.message))
  }
}

// Верификация эксперта "Подтверждённый собеседник"
const verifyExpert = async (expertId) => {
  if (!confirm('Вы уверены, что хотите верифицировать эту анкету?')) return
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.apiBase}/experts/admin/${expertId}/verify`, {
      method: 'POST'
    })

    console.log('✅ Анкета верифицирована:', response)

    const index = experts.value.findIndex(e => e.id === expertId)
    if (index !== -1) {
      experts.value[index] = { ...experts.value[index], status: 'verified' }
    }

    alert('Анкета верифицирована!')
  } catch (error) {
    console.error('❌ Ошибка верификации:', error)
    alert('Ошибка при верификации анкеты: ' + (error.data?.message || error.message))
  } finally {
    try {
      const response = await $fetch(`${config.public.apiBase}/experts/${expertId}`)
      console.log('✅ Анкета после верификации:', response)
    } catch (error) {
      console.error('❌ Ошибка получения данных после верификации:', error)
      alert('Ошибка при получении данных после верификации: ' + (error.data?.message || error.message))
    }
  }
}
// Снятие верификации
const unverifyExpert = async (expertId) => {
  if (!confirm('Вы уверены, что хотите снять верификацию с этого собеседника?')) return
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(`${config.public.apiBase}/experts/admin/${expertId}/unverify`, {
      method: 'POST'
    })

    console.log('🚫 Верификация снята:', response)

    // Обновляем локальные данные
    const index = experts.value.findIndex(e => e.id === expertId)
    if (index !== -1) {
      experts.value[index].expertIsVerified = false
    }

    alert('🚫 Верификация собеседника снята!')
  } catch (error) {
    console.error('❌ Ошибка снятия верификации:', error)
    alert('Ошибка при снятии верификации: ' + (error.data?.message || error.message))
  }
}

// Удаление анкеты
const deleteExpert = async (expertId) => {
  if (!confirm('Вы уверены, что хотите УДАЛИТЬ анкету? Это действие необратимо!')) return
  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.public.apiBase}/experts/${expertId}`, {
      method: 'DELETE'
    })

    experts.value = experts.value.filter(e => e.id !== expertId)
    alert('🗑️ Анкета успешно удалена!')
  } catch (error) {
    console.error('❌ Ошибка удаления анкеты:', error)
    alert('Ошибка при удалении анкеты: ' + (error.data?.message || error.message))
  }
}

// Вспомогательные функции
const getStatusText = (status) => {
  const statusMap = {
    'draft': 'Черновик',
    'pending': 'Ожидает оплаты',
    'active': 'Активна',
    'expired': 'Истекла',
    'rejected': 'Отклонена'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return 'Дата не указана'

  try {
    const date = new Date(dateString)

    // Проверка на валидность даты
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return 'Неверный формат даты'
    }

    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Ошибка формата даты'
  }
}

// Остаток дней публикации (источник истины — expiresAt)
const getDaysLeft = (expiresAt) => {
  if (!expiresAt) return '—'

  const now = Date.now()
  const exp = new Date(expiresAt).getTime()

  if (isNaN(exp)) return '—'

  return Math.max(
    Math.ceil((exp - now) / 86400000),
    0
  )
}

// Добавьте также функцию для отображения относительного времени
const formatRelativeTime = (dateString) => {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин. назад`
    if (diffHours < 24) return `${diffHours} ч. назад`
    if (diffDays === 1) return 'вчера'
    if (diffDays < 7) return `${diffDays} дн. назад`

    return formatDate(dateString)
  } catch (error) {
    return formatDate(dateString)
  }
}

const refreshData = () => {
  loadExperts()
}

const handleLogout = () => {
  localStorage.removeItem('adminAuthenticated')
  localStorage.removeItem('adminLoginTime')
  navigateTo('/admin-login')
}

// Продление публикации анкеты собеседника вручную админом
//Модальное окно продления публикации
const openExtendModal = (expertId) => {
  extendExpertId.value = expertId
  extendDays.value = 1
}
const closeExtendModal = () => {
  extendExpertId.value = null
  extendDays.value = 1
}
//Отправка запроса на продление вручную
const confirmExtendPublication = async () => {
  if (!extendExpertId.value) return

  const config = useRuntimeConfig()
  extendLoading.value = true

  try {
    const response = await $fetch(
      `${config.public.apiBase}/experts/admin/${extendExpertId.value}/extend`,
      {
        method: 'POST',
        body: { days: extendDays.value }
      }
    )

    const index = experts.value.findIndex(
      e => e.id === extendExpertId.value
    )

    if (index !== -1) {
      experts.value[index].expiresAt = response.expiresAt
    }

    closeExtendModal()
    alert('✅ Публикация продлена')
  } catch (error) {
    console.error('❌ Ошибка продления:', error)
    alert('Ошибка при продлении публикации')
  } finally {
    extendLoading.value = false
  }
}


// Инициализация
onMounted(() => {
  loadExperts()
})
</script>

<style scoped>
.admin-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: #f8f9fa;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding: 25px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.header-content h1 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 700;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.admin-info {
  color: #7f8c8d;
  font-size: 14px;
}

.logout-btn {
  padding: 10px 20px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-group label {
  font-weight: 600;
  color: #2c3e50;
}

.filter-select {
  padding: 10px 15px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  min-width: 180px;
}

.search-group {
  flex: 1;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
  max-width: 350px;
  padding: 10px 15px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

.refresh-btn {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background: #2980b9;
  transform: translateY(-2px);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 25px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #3498db;
}

.stat-card.pending {
  border-left-color: #f39c12;
}

.stat-card.active {
  border-left-color: #27ae60;
}

.stat-icon {
  font-size: 32px;
  margin-right: 15px;
}

.stat-content h3 {
  margin: 0 0 5px 0;
  color: #7f8c8d;
  font-size: 14px;
  font-weight: 600;
}

.stat-number {
  margin: 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 700;
}

.expert-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.expert-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.expert-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.expert-card.pending {
  border-color: #ffeaa7;
  background: #fffdf6;
}

.expert-card.active {
  border-color: #a3e4d7;
  background: #f8fefc;
}

.expert-card.rejected {
  border-color: #fadbd8;
  background: #fef7f7;
}

.expert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ecf0f1;
}

.expert-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 700;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-active {
  background: #d1ecf1;
  color: #0c5460;
}

.status-rejected {
  background: #f8d7da;
  color: #721c24;
}

.expert-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 4px 0;
}

.info-label {
  color: #7f8c8d;
  font-size: 14px;
  font-weight: 500;
}

.info-value {
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.info-value.yes {
  color: #27ae60;
}

.info-value.no {
  color: #e74c3c;
}

.payment-code {
  font-family: 'Courier New', monospace;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.price {
  color: #27ae60;
  font-weight: 700;
}

.admin-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 80px;
}

.approve-btn {
  background: #27ae60;
  color: white;
}

.approve-btn:hover {
  background: #219a52;
}

.extend-publicationt-btn {
  background: #2366a5;
  color: white;
}

.extend-publicationt-btn:hover {
  background: #5f8ac2;
}

.reject-btn {
  background: #e74c3c;
  color: white;
}

.reject-btn:hover {
  background: #c0392b;
}

.contact-btn {
  background: #3498db;
  color: white;
}

.contact-btn:hover {
  background: #2980b9;
}

.details-btn {
  background: #95a5a6;
  color: white;
}

.details-btn:hover {
  background: #7f8c8d;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.block-btn {
  background: #f39c12;
  color: white;
}

.block-btn:hover {
  background: #d68910;
}

.delete-btn {
  background: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background: #c0392b;
}

.verify-btn {
  background: #389462;
  color: white;
}

.verify-btn:hover {
  background: #05a139;
}

.unverify-btn {
  background: #f39c12;
  color: white;
}

.unverify-btn:hover {
  background: #d68910;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e3e3e3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

/* Стили модального окна продления публикации админом вручную */
/* Затемняющий фон */
.modal-extend-publication {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Контейнер модального окна */
.modal-publication {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  padding: 24px 26px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  animation: modalFadeIn 0.25s ease-out;
}

/* Заголовок */
.modal-publication h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

/* Информация о пользователе */
.modal-publication .info-value {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 6px;
  text-align: center;
}

/* Поле ввода */
.modal-publication label {
  display: block;
  margin-top: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.modal-publication input[type="number"] {
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
  transition: border-color 0.2s;
}

.modal-publication input[type="number"]:focus {
  outline: none;
  border-color: #4f46e5;
}

/* Кнопки */
.modal-publication-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
}

.modal-publication-actions button {
  flex: 1;
  padding: 10px 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s, transform 0.1s;
}

/* Подтвердить */
.modal-publication-actions button:first-child {
  background: #4f46e5;
  color: #fff;
}

.modal-publication-actions button:first-child:hover:not(:disabled) {
  background: #4338ca;
}

/* Отменить */
.modal-publication-actions button:last-child {
  background: #f3f4f6;
  color: #333;
}

.modal-publication-actions button:last-child:hover {
  background: #e5e7eb;
}

/* Заблокированная кнопка */
.modal-publication-actions button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Анимация появления */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>