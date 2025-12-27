import { defineStore } from "pinia";

export const useExpertsStore = defineStore("experts", {
  state: () => ({
    experts: process.client
      ? JSON.parse(localStorage.getItem("experts") || "[]")
      : [],
    currentExpert: process.client
      ? JSON.parse(localStorage.getItem("currentExpert") || "null")
      : null,
    loading: false,
  }),

  actions: {
    async addExpert(expert) {
      this.loading = true;
      const config = useRuntimeConfig();
      try {
        console.log("📤 Отправка данных на сервер...", expert);

        if (!expert.paymentCode) {
          console.warn("⚠️ paymentCode отсутствует, генерируем локально");
          const randomDigits = Math.floor(100 + Math.random() * 900);
          expert.paymentCode = `${expert.login}${randomDigits}`;
        }

        const response = await $fetch(config.public.apiBase + "/experts", {
          method: "POST",
          body: expert,
        });

        console.log("✅ Ответ от сервера:", response);

        this.experts.push(response);

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return response;
      } catch (error) {
        console.error("💥 Ошибка при создании эксперта:", error);

        // Fallback: сохраняем локально
        console.log("🔄 Сохранение локально...");
        const localExpert = {
          ...expert,
          id: Date.now().toString(),
          rating: 0,
          totalSessions: 0,
          adminVerified: false,
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.experts.push(localExpert);

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return localExpert;
      } finally {
        this.loading = false;
      }
    },

    async addExpertWithFiles(formData) {
      this.loading = true;

      const config = useRuntimeConfig();
      try {
        console.log("📤 Отправка данных с файлами на сервер...");

        const response = await $fetch(
          config.public.apiBase + "/experts/with-files",
          {
            method: "POST",
            body: formData,
          }
        );

        console.log("✅ Эксперт создан с файлами:", response);

        this.experts.push(response);

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return response;
      } catch (error) {
        console.error("💥 Ошибка при создании эксперта с файлами:", error);

        // Fallback: сохраняем локально без файлов
        console.log("🔄 Сохранение локально без файлов...");
        const expertData = {
          login: formData.get("login"),
          password: formData.get("password"),
          name: formData.get("name"),
          age: parseInt(formData.get("age")),
          gender: formData.get("gender"),
          availability: formData.get("availability"),
          about: formData.get("about"),
          telegram: formData.get("telegram"),
          otherMessengers: formData.get("otherMessengers"),
          allowedTopics: formData.get("allowedTopics"),
          forbiddenTopics: formData.get("forbiddenTopics"),
          price: parseFloat(formData.get("price")),
          adultTopics: formData.get("adultTopics") === "true",
          noForbiddenTopics: formData.get("noForbiddenTopics") === "true",
          alwaysAvailable: formData.get("alwaysAvailable") === "true",
          verifiedExpert: formData.get("verifiedExpert") === "true",
          expertIsVerified: formData.get("expertIsVerified") === "true",
          paymentCode: formData.get("paymentCode"),
          status: "pending",
        };

        return await this.addExpert(expertData);
      } finally {
        this.loading = false;
      }
    },

    async loginExpert(loginData) {
      this.loading = true;

      const config = useRuntimeConfig();
      try {
        const response = await $fetch(
          config.public.apiBase + "/experts/login",
          {
            method: "POST",
            body: loginData,
          }
        );

        this.setCurrentExpert(response);
        return response;
      } catch (error) {
        throw error;
      } finally {
        this.loading = false;
      }
    },

    setCurrentExpert(expert) {
      this.currentExpert = expert;
      if (process.client) {
        localStorage.setItem("currentExpert", JSON.stringify(expert));
      }
    },

    logoutExpert() {
      this.currentExpert = null;
      if (process.client) {
        localStorage.removeItem("currentExpert");
      }
    },

    // восстановить эксперта из localStorage
    restoreExpert() {
      if (!process.client) return;

      const saved = localStorage.getItem("currentExpert");
      if (saved) {
        try {
          this.currentExpert = JSON.parse(saved);
          console.log(
            "🔁 Эксперт восстановлен из localStorage:",
            this.currentExpert
          );
        } catch (e) {
          console.warn("⚠️ Ошибка восстановления эксперта");
          localStorage.removeItem("currentExpert");
          this.currentExpert = null;
        }
      }
    },

    async updateExpertProfile(expertId, updateData) {
      const config = useRuntimeConfig();
      try {
        console.log("📡 Отправка обновления на сервер...", {
          expertId,
          updateData,
        });

        const response = await $fetch(
          config.public.apiBase + `/experts/${expertId}/update`,
          {
            method: "POST",
            body: updateData,
          }
        );

        console.log("✅ Ответ от сервера:", response);

        const index = this.experts.findIndex((e) => e.id === expertId);
        if (index !== -1) {
          this.experts[index] = { ...this.experts[index], ...response };
        }

        if (this.currentExpert && this.currentExpert.id === expertId) {
          this.currentExpert = { ...this.currentExpert, ...response };
          if (process.client) {
            localStorage.setItem(
              "currentExpert",
              JSON.stringify(this.currentExpert)
            );
          }
        }

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return response;
      } catch (error) {
        console.error("❌ Ошибка обновления профиля:", error);

        const index = this.experts.findIndex((e) => e.id === expertId);
        if (index !== -1) {
          this.experts[index] = { ...this.experts[index], ...updateData };
          if (process.client) {
            localStorage.setItem("experts", JSON.stringify(this.experts));
          }
        }

        throw error;
      }
    },

    async updateExpertProfileWithFiles(expertId, formData) {
      const config = useRuntimeConfig();
      try {
        console.log("📡 Отправка обновления с файлами на сервер...", expertId);

        const response = await $fetch(
          config.public.apiBase + `/experts/${expertId}/update-with-files`,
          {
            method: "POST",
            body: formData,
          }
        );

        console.log("✅ Ответ от сервера:", response);

        const index = this.experts.findIndex((e) => e.id === expertId);
        if (index !== -1) {
          this.experts[index] = { ...this.experts[index], ...response };
        }

        if (this.currentExpert && this.currentExpert.id === expertId) {
          this.currentExpert = { ...this.currentExpert, ...response };
          if (process.client) {
            localStorage.setItem(
              "currentExpert",
              JSON.stringify(this.currentExpert)
            );
          }
        }

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return response;
      } catch (error) {
        console.error("❌ Ошибка обновления профиля с файлами:", error);
        throw error;
      }
    },

    async requestModeration(expertId) {
      const config = useRuntimeConfig();
      try {
        console.log("📋 Запрос модерации для эксперта:", expertId);

        const response = await $fetch(
          config.public.apiBase + `/experts/${expertId}/moderation`,
          {
            method: "POST",
          }
        );

        console.log("✅ Ответ на запрос модерации:", response);

        const index = this.experts.findIndex((e) => e.id === expertId);
        if (index !== -1) {
          this.experts[index] = { ...this.experts[index], ...response };
        }

        if (this.currentExpert && this.currentExpert.id === expertId) {
          this.currentExpert = { ...this.currentExpert, ...response };
          if (process.client) {
            localStorage.setItem(
              "currentExpert",
              JSON.stringify(this.currentExpert)
            );
          }
        }

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
        }

        return response;
      } catch (error) {
        console.error("❌ Ошибка запроса модерации:", error);
        throw error;
      }
    },

    async syncWithServer() {
      const config = useRuntimeConfig();
      try {
        console.log("🔄 Синхронизация с сервером...");
        const response = await $fetch(config.public.apiBase + "/experts");

        console.log("📥 Ответ от сервера:", response);
        console.log("📊 Тип ответа:", typeof response);
        console.log("📊 Это массив?", Array.isArray(response));

        // Проверяем, что response - это массив
        if (!Array.isArray(response)) {
          console.error("❌ Сервер вернул не массив:", response);
          throw new Error("Сервер вернул некорректные данные (не массив)");
        }

        console.log(`✅ Получено экспертов с сервера: ${response.length}`);

        this.experts = response.map((serverExpert) => {
          const localExpert = this.experts.find(
            (e) => e.id === serverExpert.id
          );

          return {
            ...serverExpert,
            reviews: localExpert?.reviews || serverExpert.reviews || [],
            sessions: localExpert?.sessions || serverExpert.sessions || [],
          };
        });

        if (process.client) {
          localStorage.setItem("experts", JSON.stringify(this.experts));
          console.log("💾 Данные сохранены в localStorage");
        }
      } catch (error) {
        console.error("❌ Ошибка синхронизации с сервером:", error);

        // Используем локальные данные при ошибке
        if (process.client) {
          const localExperts = localStorage.getItem("experts");
          if (localExperts) {
            this.experts = JSON.parse(localExperts);
            console.log(
              `📦 Загружено из localStorage: ${this.experts.length} экспертов`
            );
          } else {
            this.experts = [];
            console.log("📦 localStorage пуст, устанавливаем пустой массив");
          }
        }
      }
    },

    getExpertById(id) {
      return this.experts.find((e) => e.id == id);
    },

    getExpertsByStatus(status) {
      return this.experts.filter((expert) => expert.status === status);
    },

    getPendingExperts() {
      return this.experts.filter((expert) => expert.status === "pending");
    },

    getActiveExperts() {
      return this.experts.filter((expert) => expert.status === "active");
    },

    // Очистка всех локальных данных и повторная синхронизация с сервером
    async clearAndResync() {
      console.log("🧹 Очистка локальных данных и повторная синхронизация...");

      if (process.client) {
        localStorage.removeItem("experts");
        localStorage.removeItem("currentExpert");
        console.log("✅ localStorage очищен");
      }

      this.experts = [];
      this.currentExpert = null;

      await this.syncWithServer();

      console.log(
        `✅ Синхронизация завершена. Экспертов в store: ${this.experts.length}`
      );
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.currentExpert,
    currentExpertId: (state) => state.currentExpert?.id,
    isCurrentExpertAdminVerified: (state) =>
      state.currentExpert?.adminVerified || false,
    canEditProfile: (state) => {
      if (!state.currentExpert) return false;
      const editableStatuses = ["draft", "active", "pending"];
      return editableStatuses.includes(state.currentExpert.status);
    },
  },
});