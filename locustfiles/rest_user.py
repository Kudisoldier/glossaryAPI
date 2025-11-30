"""
Locust тесты для REST API (FastAPI)
"""
import random
import string
from locust import HttpUser, task, between


class RestUser(HttpUser):
    """
    Пользователь REST API, моделирующий реальное поведение клиента.
    """
    wait_time = between(1, 3)  # Пауза между запросами 1-3 секунды
    
    def on_start(self):
        """Выполняется один раз при старте пользователя"""
        # Проверка здоровья сервиса
        self.client.get("/health", name="health_check")
        # Получение списка терминов для работы
        response = self.client.get("/terms/", name="list_terms")
        if response.status_code == 200:
            terms = response.json()
            self.available_keywords = [t["keyword"] for t in terms] if terms else []
        else:
            self.available_keywords = []
    
    @task(3)
    def list_terms(self):
        """Получение списка всех терминов (частая операция)"""
        self.client.get("/terms/", name="list_terms")
    
    @task(2)
    def get_term(self):
        """Получение конкретного термина"""
        if self.available_keywords:
            keyword = random.choice(self.available_keywords)
            self.client.get(f"/terms/{keyword}", name="get_term")
    
    @task(1)
    def create_term(self):
        """Создание нового термина (менее частая операция)"""
        keyword = ''.join(random.choices(string.ascii_lowercase, k=8))
        description = f"Test description for {keyword}"
        self.client.post(
            "/terms/",
            json={"keyword": keyword, "description": description},
            name="create_term"
        )
        # Добавляем в список доступных ключевых слов
        if keyword not in self.available_keywords:
            self.available_keywords.append(keyword)
    
    @task(1)
    def update_term(self):
        """Обновление существующего термина"""
        if self.available_keywords:
            keyword = random.choice(self.available_keywords)
            new_description = f"Updated description for {keyword}"
            self.client.put(
                f"/terms/{keyword}",
                json={"description": new_description},
                name="update_term"
            )
    
    @task(1)
    def delete_term(self):
        """Удаление термина (редкая операция)"""
        if len(self.available_keywords) > 5:  # Не удаляем все термины
            keyword = random.choice(self.available_keywords)
            self.client.delete(f"/terms/{keyword}", name="delete_term")
            self.available_keywords.remove(keyword)

