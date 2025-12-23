<template>
  <div class="expert-registration">
    <form @submit.prevent="handleSubmit" class="expert-form" enctype="multipart/form-data">
      <h2>{{ isEditMode ? 'Редактирование профиля' : 'Регистрация собеседника' }}</h2>

      <!-- Основные поля -->
      <div class="form-section">
        <h3>Основная информация</h3>
        <p>* Поля обязательные для заполнения </p>
        
        <label>
          Логин *
          <input v-model="form.login" type="text" required />
        </label>

        <label v-if="!isEditMode" class="password-field">
          Пароль * минимум 6 символов
          <div class="password-input-wrapper">
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="минимум 6 символов" 
              required 
              class="password-input"
            />
            <button 
              type="button" 
              class="toggle-password"
              @click="togglePasswordVisibility"
              tabindex="-1"
            >
              <span v-if="showPassword" class="icon">👁️</span>
              <span v-else class="icon">👁️‍🗨️</span>
            </button>
          </div>
        </label>
        <label v-if="isEditMode" class="password-field">
          Новый пароль
          <div class="password-input-wrapper">
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Оставьте пустым, если не меняете" 
              class="password-input"
            />
            <button 
              type="button" 
              class="toggle-password"
              @click="togglePasswordVisibility"
              tabindex="-1"
            >
              <span v-if="showPassword" class="icon">👁️</span>
              <span v-else class="icon">👁️‍🗨️</span>
            </button>
          </div>
        </label>
        <label v-if="isEditMode && form.password" class="password-field">
          Подтверждение нового пароля
          <input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="Повторите новый пароль" 
            class="password-input"
            required
          />
        </label>

        <label>
          Имя и Фамилия *
          <input v-model="form.name" type="text" required />
        </label>

        <label>
          Возраст *
          <input v-model.number="form.age" type="number" min="18" required />
        </label>
        
        <label>
          Пол *
          <select v-model="form.gender" required>
            <option value="">Выберите пол</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </label>
        
        <label>
          Telegram *
          <input v-model="form.telegram" type="text" placeholder="@username" required />
        </label>
      </div>

      <!-- Темы и настройки -->
      <div class="form-section">
        <h3>Темы и настройки</h3>
       
        <label>
          Информация о себе *
          <textarea
            v-model="form.about"
            required
            placeholder="Коротко о себе, ваших интересах и предпочтениях. В конце можете указать стоимость видео, аудио, письменного общения (до 1000 символов)"
            maxlength="1000"
          ></textarea>
          <small>{{ form.about.length }}/1000</small>
        </label>

        <label>
          Предпочтительные темы *
          <input v-model="form.allowedTopics" type="text" required
            placeholder="Укажите темы наиболее интересные для вас" />
        </label>

        <label>
          Запрещённые темы 
          <input v-model="form.forbiddenTopics" type="text" placeholder="Пропустите это поле, если вы, действительно, готовы обсуждать любые темы" />
        </label>

        <label>
          Стоимость часа общения от*
          <input v-model.number="form.price" type="number" min="0" required />
        </label>

        <div class="checkboxes">
          <label class="checkbox">
            <input type="checkbox" v-model="form.adultTopics" />
            <span>Готов обсуждать темы 18+</span>
          </label>

          <label class="checkbox">
            <input type="checkbox" v-model="form.noForbiddenTopics" />
            <span>Запрещённых тем нет</span>
          </label>
          <label class="checkbox">
            <input type="checkbox" v-model="form.alwaysAvailable" />
            <span>Готов откликаться 24/7</span>            
          </label>
        </div>
      </div>

      <!-- Секция загрузки файлов -->
      <div class="form-section">
        <h3>Фотографии и видео</h3>

        <!-- Главное фото -->
        <label :class="{ 'required-field-missing': !isEditMode && !mainPhotoFile }">
          Главное фото (аватар) *
          <input 
            type="file" 
            @change="handleMainPhotoChange"
            accept="image/*"
            :required="!isEditMode"
            :class="{ 'input-error': !isEditMode && !mainPhotoFile }"
          />
          <small>Рекомендуемый размер: 500x500px, формат JPG/PNG</small>
          <small v-if="!isEditMode && !mainPhotoFile" class="error-hint">
            ⚠️ Это поле обязательно для заполнения
          </small>
          <div v-if="mainPhotoPreview" class="image-preview">
            <img :src="mainPhotoPreview" alt="Предпросмотр главного фото" />
          </div>
        </label>

        <!-- Галерея -->
        <label>
          Галерея (до 10 файлов)
          <input 
            type="file" 
            multiple 
            @change="handleGalleryChange"
            accept="image/*,video/*"
            ref="galleryInput"
          />
          <small>Можно загружать фото и видео до 10MB каждый. Максимум 10 файлов.</small>
          
          <!-- Предпросмотр галереи -->
          <div v-if="galleryPreviews.length" class="gallery-previews">
            <div 
              v-for="(preview, index) in galleryPreviews" 
              :key="index"
              class="gallery-preview-item"
            >
              <img v-if="preview.type === 'image'" :src="preview.url" :alt="`Галерея ${index + 1}`" />
              <video v-else controls :src="preview.url"></video>
              <button 
                type="button" 
                @click="removeGalleryFile(index)"
                class="remove-file-btn"
              >
                ×
              </button>
            </div>
          </div>
          
          <div class="file-count">
            Загружено файлов: {{ galleryPreviews.length }}/10
          </div>
        </label>
      </div>

      <!-- Кнопки действий -->
      <div class="action-buttons">
        <button 
          type="submit" 
          :disabled="loading || !isFormValid"
          class="submit-btn"
          :title="!isFormValid && !isEditMode && !mainPhotoFile ? 'Загрузите главное фото' : ''"
        >
          {{ loading ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Стать собеседником') }}
        </button>

        <button 
          v-if="isEditMode && existingExpert && !existingExpert.adminVerified"
          type="button"
          @click="requestModeration"
          class="moderation-btn"
        >
          Пройти модерацию
        </button>

        <!-- Сообщение об ошибке если нет главного фото -->
        <div v-if="!isEditMode && !mainPhotoFile && !isFormValid" class="validation-error">
          ⚠️ Загрузите главное фото (аватар) для продолжения
        </div>
      </div>
    </form>

    <!-- Модальное окно оплаты -->
    <div v-if="showPaymentModal" class="modal-overlay">
      <div class="payment-modal">
        <h3>Уважаемый собеседник, благодарим Вас за публикацию анкеты!</h3>
        <p><strong>Срок бесплатной публикации 60 дней</strong></p>
        
        <div class="payment-info">
        </div>

        <div class="payment-actions">
          <button @click="confirmPayment" :disabled="paymentLoading" class="confirm-btn">
            {{ paymentLoading ? 'Подтверждение...' : 'Опубликовать анкету' }}
          </button>
          <button @click="showPaymentModal = false" class="cancel-btn">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { useExpertsStore } from '~/stores/expertsStore'

const route = useRoute()
const router = useRouter()
const expertsStore = useExpertsStore()

// Режимы и состояния
const isEditMode = computed(() => route.query.edit)
const existingExpert = ref(null)
const loading = ref(false)
const paymentLoading = ref(false)
const showPaymentModal = ref(false)
const paymentCode = ref('')
const showPassword = ref(false) // Добавлено состояние видимости пароля

// Данные формы
const form = ref({
  login: '',
  password: '',
  confirmPassword: '',
  name: '',
  age: null,
  gender: '',
  availability: 'Свободен',
  about: '',
  telegram: '',
  otherMessengers: '',
  allowedTopics: '',
  forbiddenTopics: '',
  price: 0,
  adultTopics: false,
  noForbiddenTopics: false,
  alwaysAvailable: false,
  expertIsVerified: false,
})

// Данные для файлов
const mainPhotoFile = ref(null)
const mainPhotoPreview = ref('')
const galleryFiles = ref([])
const galleryPreviews = ref([])
const galleryInput = ref(null)

// Функция переключения видимости пароля
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Валидация формы
const isFormValid = computed(() => {
  // Базовые обязательные поля
  let requiredFields = [
    form.value.login,
    form.value.name,
    form.value.age,
    form.value.gender,
    form.value.telegram,
    form.value.about,
    form.value.allowedTopics,
    form.value.price
  ]
  
  // Пароль обязателен только при создании нового профиля
  if (!isEditMode.value) {
    requiredFields.push(form.value.password)
  }
  
  const fieldsValid = requiredFields.every(field => field !== '' && field !== null && field !== 0)
  
  // В режиме создания требуем главное фото
  if (!isEditMode.value) {
    return fieldsValid && mainPhotoFile.value !== null
  }
  
  return fieldsValid
})

// Загрузка данных для редактирования
onMounted(async () => {
  if (isEditMode.value) {
    const config = useRuntimeConfig() 
    try {
      console.log('🔄 Загрузка данных эксперта ID:', isEditMode.value)
      const response = await $fetch(`${config.public.apiBase}/experts/profile/${isEditMode.value}`)
      existingExpert.value = response
      
      console.log('📦 Полученные данные:', response)
      console.log('🖼️ galleryUrls в response:', response.galleryUrls)
      
      // Заполняем форму данными эксперта
      Object.keys(form.value).forEach(key => {
        if (key in existingExpert.value) {
          form.value[key] = existingExpert.value[key]
        }
      })
      
      console.log('📝 Форма после заполнения:', form.value)
      console.log('👤 Пол (gender):', form.value.gender)
      
      
      // Если есть существующее фото, показываем его
      if (existingExpert.value.mainPhotoUrl) {
        mainPhotoPreview.value = `${config.public.fileBase}${existingExpert.value.mainPhotoUrl}`
      }
      
      // Загружаем существующую галерею
      if (existingExpert.value.galleryUrls) {
        let galleryUrlsArray = []
        
        console.log('🖼️ Исходные galleryUrls:', existingExpert.value.galleryUrls)
        console.log('🔍 Тип galleryUrls:', typeof existingExpert.value.galleryUrls)
        
        // Парсим galleryUrls если это строка (JSON)
        if (typeof existingExpert.value.galleryUrls === 'string') {
          try {
            galleryUrlsArray = JSON.parse(existingExpert.value.galleryUrls)
            console.log('✅ Распарсенный массив:', galleryUrlsArray)
          } catch (e) {
            console.error('❌ Ошибка парсинга galleryUrls:', e)
          }
        } else if (Array.isArray(existingExpert.value.galleryUrls)) {
          galleryUrlsArray = existingExpert.value.galleryUrls
          console.log('✅ Уже массив:', galleryUrlsArray)
        }
        
        // Добавляем превью существующих изображений
        galleryPreviews.value = galleryUrlsArray.map(url => ({
          url: `${config.public.fileBase}${url}`,
          type: url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? 'image' : 'video',
          isExisting: true // Флаг что это существующий файл, не новый
        }))
        
        console.log('📸 Финальный galleryPreviews:', galleryPreviews.value)
      } else {
        console.log('⚠️ galleryUrls пустой или undefined')
      }
    } catch (error) {
      console.error('Ошибка загрузки данных эксперта:', error)
    }
  }
})

// Генерация кода оплаты
const generatePaymentCode = () => {
  const randomDigits = Math.floor(100 + Math.random() * 900) // 100-999
  return `${form.value.login}${randomDigits}`
}

// Обработчик главного фото
const handleMainPhotoChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Проверка размера
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл слишком большой. Максимальный размер: 10MB')
    event.target.value = ''
    return
  }

  mainPhotoFile.value = file
  
  // Создание preview
  const reader = new FileReader()
  reader.onload = (e) => {
    mainPhotoPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// Обработчик галереи
const handleGalleryChange = (event) => {
  const files = Array.from(event.target.files)
  
  // Проверка количества файлов (учитываем существующие + новые)
  if (galleryPreviews.value.length + files.length > 10) {
    alert('Максимум можно загрузить 10 файлов')
    event.target.value = ''
    return
  }

  files.forEach(file => {
    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
      alert(`Файл ${file.name} слишком большой. Максимальный размер: 10MB`)
      return
    }

    // Проверка типа
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert(`Файл ${file.name} должен быть изображением или видео`)
      return
    }

    galleryFiles.value.push(file)
    
    // Создание preview
    const reader = new FileReader()
    reader.onload = (e) => {
      galleryPreviews.value.push({
        url: e.target.result,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        isExisting: false // Это новый файл
      })
    }
    reader.readAsDataURL(file)
  })

  // Очистка input
  if (galleryInput.value) {
    galleryInput.value.value = ''
  }
}

// Удаление файла из галереи
const removeGalleryFile = (index) => {
  const preview = galleryPreviews.value[index]
  
  // Если это существующий файл, удаляем только превью
  // Если это новый файл, удаляем и из galleryFiles
  if (!preview.isExisting) {
    // Находим соответствующий индекс в galleryFiles
    // Учитываем что в galleryFiles нет существующих файлов
    const existingCount = galleryPreviews.value.slice(0, index).filter(p => p.isExisting).length
    const fileIndex = index - existingCount
    galleryFiles.value.splice(fileIndex, 1)
  }
  
  galleryPreviews.value.splice(index, 1)
}

// Основная функция отправки
const handleSubmit = async () => {
  // Проверка главного фото только для новой регистрации
  if (!mainPhotoFile.value && !isEditMode.value) {
    alert('⚠️ Загрузите главное фото (аватар) для продолжения регистрации')
    return
  }

  if (!isFormValid.value) {
    alert('Пожалуйста, заполните все обязательные поля (отмечены *)')
    return
  }

  loading.value = true

  try {
    if (isEditMode.value && existingExpert.value) {
      // Режим редактирования - создаем FormData с файлами
      console.log('✏️ Режим редактирования, ID эксперта:', existingExpert.value.id)
      const formData = new FormData()
      
      // Добавляем все поля формы
      Object.keys(form.value).forEach(key => {
        const value = form.value[key]
        // Исключаем пароль и подтверждение, если не меняется
        if (isEditMode.value && (key === 'password' || key === 'confirmPassword') && !form.value.password) {
          return
        }
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'boolean') {
            formData.append(key, value.toString())
          } else {
            formData.append(key, value)
          }
        }
      })
      
      console.log('📝 Данные формы:')
      for (let pair of formData.entries()) {
        console.log(`  ${pair[0]}: ${pair[1]}`)
      }
      
      // Добавляем файлы если они есть
      if (mainPhotoFile.value) {
        formData.append('mainPhoto', mainPhotoFile.value)
        console.log('📷 Добавлено главное фото:', mainPhotoFile.value.name)
      }
      
      galleryFiles.value.forEach((file, index) => {
        formData.append('gallery', file)
        console.log(`🖼️ Добавлено фото галереи ${index + 1}:`, file.name)
      })
      
      console.log('📡 Отправка обновления на сервер...')
      await expertsStore.updateExpertProfileWithFiles(existingExpert.value.id, formData)
      console.log('✅ Обновление успешно!')
      await navigateTo(`/expert-profile/${existingExpert.value.id}`)
      alert('Профиль успешно обновлен!')
    } else {
      // Режим создания - показываем окно оплаты
      paymentCode.value = generatePaymentCode()
      showPaymentModal.value = true
    }
  } catch (err) {
    console.error('Ошибка:', err)
    alert('Произошла ошибка: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Подтверждение оплаты с отправкой файлов
const confirmPayment = async () => {
  paymentLoading.value = true
  
  try {
    // Создаем FormData для отправки файлов
    const formData = new FormData()
    
    // Добавляем все поля формы с правильным преобразованием типов
    Object.keys(form.value).forEach(key => {
      const value = form.value[key]
      if (value !== null && value !== undefined && value !== '') {
        // Преобразуем булевы значения в строки для FormData
        if (typeof value === 'boolean') {
          formData.append(key, value.toString())
        } else {
          formData.append(key, value)
        }
      }
    })
    
    // Добавляем дополнительные поля оплаты
    formData.append('publicationDays', selectedDays.value.toString())
    formData.append('paymentAmount', paymentAmount.value.toString())
    formData.append('paymentCode', paymentCode.value)
    formData.append('status', 'pending')

    
    // Добавляем файлы
    if (mainPhotoFile.value) {
      formData.append('mainPhoto', mainPhotoFile.value)
    }
    
    galleryFiles.value.forEach((file) => {
      formData.append('gallery', file)
    })
    
    // Отправляем с файлами
    await expertsStore.addExpertWithFiles(formData)
    showPaymentModal.value = false
    await navigateTo('/')
    alert('Анкета отправлена на модерацию! После проверки оплаты она будет опубликована.')
  } catch (err) {
    console.error('Ошибка при создании эксперта:', err)
    alert('Ошибка при создании анкеты: ' + err.message)
  } finally {
    paymentLoading.value = false
  }
}

// Запрос модерации
const requestModeration = async () => {
  try {
    await expertsStore.requestModeration(existingExpert.value.id)
    alert('Запрос на модерацию отправлен! Администратор проверит ваши данные.')
  } catch (err) {
    console.error('Ошибка запроса модерации:', err)
    alert('Ошибка при отправке запроса: ' + err.message)
  }
}

// счетчик для выбора срока публикации
const selectedDays = ref(60)

const paymentAmount = computed(() => {
  const base = 1000
  const multiplier = selectedDays.value / 30
  let discount = 0

  // Условия скидки по процентам
  if (selectedDays.value >= 60 && selectedDays.value < 90) discount = 0.02
  else if (selectedDays.value >= 90 && selectedDays.value < 120) discount = 0.03
  else if (selectedDays.value >= 120 && selectedDays.value < 150) discount = 0.04
  else if (selectedDays.value >= 150 && selectedDays.value < 180) discount = 0.05
  else if (selectedDays.value >= 180 && selectedDays.value < 210) discount = 0.06
  else if (selectedDays.value >= 210 && selectedDays.value < 240) discount = 0.07
  else if (selectedDays.value >= 240 && selectedDays.value < 270) discount = 0.08
  else if (selectedDays.value >= 270 && selectedDays.value < 300) discount = 0.09
  else if (selectedDays.value >= 300) discount = 0.10

  const rawAmount = base * multiplier
  const finalAmount = rawAmount - rawAmount * discount
  return Math.round(finalAmount)
})
// Вычисление процента скидки
const discountPercent = computed(() => {
  if (selectedDays.value >= 60 && selectedDays.value < 90) return 2
  else if (selectedDays.value >= 90 && selectedDays.value < 120) return 3
  else if (selectedDays.value >= 120 && selectedDays.value < 150) return 4
  else if (selectedDays.value >= 150 && selectedDays.value < 180) return 5
  else if (selectedDays.value >= 180 && selectedDays.value < 210) return 6
  else if (selectedDays.value >= 210 && selectedDays.value < 240) return 7
  else if (selectedDays.value >= 240 && selectedDays.value < 270) return 8
  else if (selectedDays.value >= 270 && selectedDays.value < 300) return 9
  else if (selectedDays.value >= 300) return 10
  else return 0
})


</script>

<style scoped>
.expert-registration {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.expert-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  border: 1px solid #e0e0e0;
  padding: 20px;
  border-radius: 8px;
  background: #fafafa;
}

.form-section h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  margin-bottom: 15px;
}

label.required-field-missing {
  position: relative;
}

/* Стили для поля пароля */
.password-field {
  position: relative;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 40px; /* Место для кнопки */
  width: 100%;
}

.toggle-password {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.1em;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #2b7bff;
}

.toggle-password:focus {
  outline: 2px solid #2b7bff;
  outline-offset: 2px;
  border-radius: 4px;
}

.icon {
  display: inline-block;
  user-select: none;
}

input,
select,
textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 5px;
}

input.input-error {
  border: 2px solid #e74c3c;
  background-color: #ffe6e6;
}

small {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-weight: normal;
}

small.error-hint {
  color: #e74c3c;
  font-weight: 600;
  margin-top: 6px;
  background-color: #ffe6e6;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #e74c3c;
}

.checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox {
  flex-direction: row;
  align-items: center;
  font-weight: normal;
}

.checkbox input {
  margin-right: 10px;
  margin-top: 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  flex-direction: column;
}

.submit-btn {
  flex: 1;
  padding: 15px;
  background: #2b7bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.moderation-btn {
  padding: 15px 20px;
  background: #ffa500;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.validation-error {
  background: #ffe6e6;
  color: #c0392b;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  border: 1px solid #ffcccc;
  text-align: center;
  font-weight: 500;
}

/* Стили модального окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.payment-modal {
  background: white;
  padding: 30px;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
}

.payment-info {
  margin: 20px 0;
}

.payment-code {
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: #2b7bff;
}

.important {
  color: #e74c3c;
  font-weight: bold;
}

.payment-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.confirm-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 10px 20px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

/* Добавьте стили для preview */
.image-preview {
  margin-top: 10px;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.gallery-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.gallery-preview-item {
  position: relative;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.gallery-preview-item img,
.gallery-preview-item video {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.remove-file-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.file-count {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

input[type="file"] {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
}

.slider-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 15px 0;
}

.slider-section input[type="range"] {
  width: 200px;
}

.slider-section button {
  background: #2b7bff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: 0.2s;
}

.slider-section button:hover {
  background: #1a5ee8;
}
.discount-text {
  font-size: 16px;
  color: #27ae60;
  font-weight: bold;
  margin-top: 8px;
}

/* ==========================================================
   📱 АДАПТИВНОСТЬ
   ========================================================== */

/* === Маленькие смартфоны (до 375px) === */
@media (max-width: 375px) {
  .expert-registration {
    padding: 10px;
    max-width: 100%;
  }

  .expert-form {
    gap: 15px;
  }

  .expert-form h2 {
    font-size: 1.3rem;
    text-align: center;
  }

  .form-section {
    padding: 12px;
  }

  .form-section h3 {
    font-size: 1.1rem;
  }

  input,
  select,
  textarea {
    font-size: 16px; /* Предотвращает zoom на iOS */
    padding: 8px;
  }

  .password-input {
    padding-right: 38px;
  }

  .toggle-password {
    right: 6px;
    padding: 5px;
  }

  .checkboxes {
    gap: 8px;
  }

  .checkbox span {
    font-size: 13px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .submit-btn,
  .moderation-btn {
    width: 100%;
    padding: 12px;
    font-size: 15px;
  }

  /* Модальное окно */
  .payment-modal {
    padding: 20px;
    width: 95%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .payment-modal h3 {
    font-size: 1.2rem;
  }

  .payment-info p {
    font-size: 14px;
    line-height: 1.5;
  }

  .payment-code {
    font-size: 16px;
    word-break: break-all;
  }

  .slider-section {
    flex-direction: column;
    gap: 10px;
  }

  .slider-section input[type="range"] {
    width: 100%;
  }

  .slider-section button {
    width: 40px;
    height: 40px;
  }

  .payment-actions {
    flex-direction: column;
    gap: 8px;
  }

  .confirm-btn,
  .cancel-btn {
    width: 100%;
    padding: 12px;
  }

  /* Превью галереи */
  .gallery-previews {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .gallery-preview-item img,
  .gallery-preview-item video {
    height: 100px;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 180px;
  }
}

/* === Обычные смартфоны (376px - 480px) === */
@media (min-width: 376px) and (max-width: 480px) {
  .expert-registration {
    padding: 15px;
  }

  .expert-form h2 {
    font-size: 1.5rem;
    text-align: center;
  }

  .form-section {
    padding: 15px;
  }

  input,
  select,
  textarea {
    font-size: 16px; /* Предотвращает zoom на iOS */
  }

  .payment-modal {
    padding: 25px;
    width: 92%;
  }

  .slider-section input[type="range"] {
    width: 180px;
  }

  .gallery-previews {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* === Планшеты (481px - 768px) === */
@media (min-width: 481px) and (max-width: 768px) {
  .expert-registration {
    padding: 20px;
    max-width: 700px;
  }

  .form-section {
    padding: 18px;
  }

  .payment-modal {
    max-width: 600px;
    width: 85%;
  }

  .slider-section input[type="range"] {
    width: 250px;
  }

  .gallery-previews {
    grid-template-columns: repeat(4, 1fr);
  }

  .action-buttons {
    flex-direction: row;
  }
}

/* === Ноутбуки и десктоп (769px+) === */
@media (min-width: 769px) {
  .expert-registration {
    padding: 30px;
  }

  .gallery-previews {
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }

  .slider-section input[type="range"] {
    width: 300px;
  }

  .payment-modal {
    max-width: 550px;
  }
}

/* === Большие экраны (1200px+) === */
@media (min-width: 1200px) {
  .expert-registration {
    max-width: 700px;
  }

  .form-section {
    padding: 25px;
  }
}
</style>