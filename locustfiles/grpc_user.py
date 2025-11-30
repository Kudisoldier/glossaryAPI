"""
Locust тесты для gRPC API
"""
import random
import string
import time
import grpc
from locust import User, task, between, events

# Импортируем сгенерированные файлы
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from app.protos import terms_pb2, terms_pb2_grpc


class GrpcUser(User):
    """
    Пользователь gRPC API, моделирующий реальное поведение клиента.
    """
    wait_time = between(1, 3)  # Пауза между запросами 1-3 секунды
    
    def on_start(self):
        """Выполняется один раз при старте пользователя"""
        # Создаем gRPC канал и stub
        self.channel = grpc.insecure_channel(self.host)
        self.stub = terms_pb2_grpc.TermsServiceStub(self.channel)
        
        # Проверка здоровья сервиса
        try:
            request = terms_pb2.HealthCheckRequest()
            self.stub.Health(request)
        except Exception as e:
            events.request.fire(
                request_type="grpc",
                name="health_check",
                response_time=0,
                response_length=0,
                exception=e
            )
        
        # Получение списка терминов для работы
        try:
            request = terms_pb2.ListTermsRequest()
            response = self.stub.ListTerms(request)
            self.available_keywords = [t.keyword for t in response.terms] if response.terms else []
        except Exception as e:
            self.available_keywords = []
            events.request.fire(
                request_type="grpc",
                name="list_terms",
                response_time=0,
                response_length=0,
                exception=e
            )
    
    def on_stop(self):
        """Выполняется при остановке пользователя"""
        if hasattr(self, 'channel'):
            self.channel.close()
    
    def _make_request(self, request_func, request_obj, name):
        """Вспомогательная функция для выполнения gRPC запросов с метриками"""
        start_time = time.time()
        try:
            response = request_func(request_obj)
            response_time = int((time.time() - start_time) * 1000)
            events.request.fire(
                request_type="grpc",
                name=name,
                response_time=response_time,
                response_length=0,
                exception=None
            )
            return response
        except grpc.RpcError as e:
            response_time = int((time.time() - start_time) * 1000)
            # NOT_FOUND и ALREADY_EXISTS - это валидные бизнес-ответы, не ошибки
            if e.code() in (grpc.StatusCode.NOT_FOUND, grpc.StatusCode.ALREADY_EXISTS):
                events.request.fire(
                    request_type="grpc",
                    name=name,
                    response_time=response_time,
                    response_length=0,
                    exception=None
                )
            else:
                events.request.fire(
                    request_type="grpc",
                    name=name,
                    response_time=response_time,
                    response_length=0,
                    exception=e
                )
            raise
    
    @task(3)
    def list_terms(self):
        """Получение списка всех терминов (частая операция)"""
        request = terms_pb2.ListTermsRequest()
        self._make_request(self.stub.ListTerms, request, "list_terms")
    
    @task(2)
    def get_term(self):
        """Получение конкретного термина"""
        if self.available_keywords:
            keyword = random.choice(self.available_keywords)
            request = terms_pb2.GetTermRequest(keyword=keyword)
            self._make_request(self.stub.GetTerm, request, "get_term")
    
    @task(1)
    def create_term(self):
        """Создание нового термина (менее частая операция)"""
        keyword = ''.join(random.choices(string.ascii_lowercase, k=8))
        description = f"Test description for {keyword}"
        request = terms_pb2.CreateTermRequest(keyword=keyword, description=description)
        try:
            self._make_request(self.stub.CreateTerm, request, "create_term")
            if keyword not in self.available_keywords:
                self.available_keywords.append(keyword)
        except grpc.RpcError:
            pass  # Термин уже существует
    
    @task(1)
    def update_term(self):
        """Обновление существующего термина"""
        if self.available_keywords:
            keyword = random.choice(self.available_keywords)
            new_description = f"Updated description for {keyword}"
            from google.protobuf import wrappers_pb2
            request = terms_pb2.UpdateTermRequest(
                keyword=keyword,
                description=wrappers_pb2.StringValue(value=new_description)
            )
            self._make_request(self.stub.UpdateTerm, request, "update_term")
    
    @task(1)
    def delete_term(self):
        """Удаление термина (редкая операция)"""
        if len(self.available_keywords) > 5:  # Не удаляем все термины
            keyword = random.choice(self.available_keywords)
            request = terms_pb2.DeleteTermRequest(keyword=keyword)
            try:
                self._make_request(self.stub.DeleteTerm, request, "delete_term")
                self.available_keywords.remove(keyword)
            except grpc.RpcError:
                pass

