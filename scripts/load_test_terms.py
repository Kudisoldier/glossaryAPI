#!/usr/bin/env python3
"""
Скрипт для загрузки терминов по теме "Автогенерация тестов для веб платформы"
"""
import sys
from pathlib import Path

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from app.db import engine, init_db
from app.models import Term, TermRelation, Source, RelationType

# Определение терминов с описаниями и категориями
TERMS = [
    {
        "keyword": "Автогенерация тестов",
        "description": "Процесс автоматического создания тестовых сценариев с использованием специальных инструментов и алгоритмов без ручного написания кода тестов. Включает генерацию unit-тестов, интеграционных тестов и E2E тестов на основе анализа кода, спецификаций или моделей поведения системы.",
        "category": "Основные понятия",
        "sources": [
            {
                "title": "Automated Test Generation: A Systematic Literature Review",
                "author": "M. Staats, P. Heimdahl",
                "year": 2015,
                "url": "https://ieeexplore.ieee.org/document/7163024"
            }
        ]
    },
    {
        "keyword": "Веб-платформа",
        "description": "Программная платформа, предназначенная для разработки и развертывания веб-приложений. Включает в себя серверную часть (backend), клиентскую часть (frontend), базы данных, API и инфраструктуру для обеспечения работы веб-сервисов.",
        "category": "Основные понятия",
        "sources": [
            {
                "title": "Web Platform Design Principles",
                "author": "W3C",
                "year": 2023,
                "url": "https://www.w3.org/TR/web-platform-design-principles/"
            }
        ]
    },
    {
        "keyword": "Unit-тесты",
        "description": "Тесты, которые проверяют отдельные модули или функции кода в изоляции от остальной системы. Используются для проверки корректности работы отдельных компонентов на ранних этапах разработки.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "The Art of Unit Testing",
                "author": "R. Osherove",
                "year": 2013,
                "url": "https://www.manning.com/books/the-art-of-unit-testing"
            }
        ]
    },
    {
        "keyword": "Интеграционные тесты",
        "description": "Тесты, проверяющие взаимодействие между различными компонентами системы. Оценивают корректность интеграции модулей, взаимодействие с базами данных, внешними API и другими сервисами.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "Integration Testing: Strategies and Best Practices",
                "author": "B. Hamill",
                "year": 2020,
                "url": "https://www.testim.io/blog/integration-testing/"
            }
        ]
    },
    {
        "keyword": "E2E тесты",
        "description": "End-to-End тесты, проверяющие полный пользовательский сценарий от начала до конца. Симулируют реальное использование приложения пользователем, включая взаимодействие с интерфейсом, навигацию и выполнение бизнес-логики.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "End-to-End Testing: A Comprehensive Guide",
                "author": "M. Fowler",
                "year": 2018,
                "url": "https://martinfowler.com/articles/practical-test-pyramid.html"
            }
        ]
    },
    {
        "keyword": "Selenium",
        "description": "Фреймворк для автоматизации тестирования веб-приложений. Позволяет управлять браузером программно, выполнять действия пользователя и проверять состояние веб-страниц. Поддерживает множество языков программирования и браузеров.",
        "category": "Инструменты",
        "sources": [
            {
                "title": "Selenium Documentation",
                "author": "Selenium Project",
                "year": 2024,
                "url": "https://www.selenium.dev/documentation/"
            }
        ]
    },
    {
        "keyword": "Playwright",
        "description": "Современный фреймворк для автоматизации тестирования веб-приложений, разработанный Microsoft. Обеспечивает быструю и надежную автоматизацию браузеров с поддержкой Chrome, Firefox, Safari и Edge. Включает встроенные возможности для генерации тестов.",
        "category": "Инструменты",
        "sources": [
            {
                "title": "Playwright Documentation",
                "author": "Microsoft",
                "year": 2024,
                "url": "https://playwright.dev/"
            }
        ]
    },
    {
        "keyword": "Cypress",
        "description": "Фреймворк для E2E тестирования веб-приложений с удобным API и встроенным инструментарием для отладки. Работает непосредственно в браузере, обеспечивая быстрые и стабильные тесты с возможностью записи и воспроизведения действий.",
        "category": "Инструменты",
        "sources": [
            {
                "title": "Cypress Documentation",
                "author": "Cypress.io",
                "year": 2024,
                "url": "https://docs.cypress.io/"
            }
        ]
    },
    {
        "keyword": "Test Automation",
        "description": "Автоматизация процесса тестирования программного обеспечения с использованием специальных инструментов и скриптов. Позволяет выполнять тесты быстрее, чаще и более надежно, чем ручное тестирование.",
        "category": "Основные понятия",
        "sources": [
            {
                "title": "Test Automation Fundamentals",
                "author": "M. Winter",
                "year": 2021,
                "url": "https://www.oreilly.com/library/view/test-automation-fundamentals/9781492079366/"
            }
        ]
    },
    {
        "keyword": "Test Coverage",
        "description": "Метрика, показывающая процент кода, покрытого тестами. Измеряется как отношение количества протестированных строк кода к общему количеству строк. Высокое покрытие не гарантирует качество тестов, но является важным показателем.",
        "category": "Метрики и анализ",
        "sources": [
            {
                "title": "Code Coverage Analysis",
                "author": "G. Meszaros",
                "year": 2007,
                "url": "https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Code/dp/0131495054"
            }
        ]
    },
    {
        "keyword": "Mutation Testing",
        "description": "Техника тестирования, которая оценивает качество тестов путем внесения небольших изменений (мутаций) в код и проверки, обнаруживают ли тесты эти изменения. Если тесты не обнаруживают мутацию, это указывает на недостаточное качество тестов.",
        "category": "Метрики и анализ",
        "sources": [
            {
                "title": "Mutation Testing: A Survey",
                "author": "Y. Jia, M. Harman",
                "year": 2011,
                "url": "https://ieeexplore.ieee.org/document/6065952"
            }
        ]
    },
    {
        "keyword": "Property-based Testing",
        "description": "Подход к тестированию, при котором тесты формулируются как свойства, которые должны выполняться для множества входных данных. Инструменты автоматически генерируют тестовые данные и проверяют выполнение свойств.",
        "category": "Методы тестирования",
        "sources": [
            {
                "title": "QuickCheck: A Lightweight Tool for Random Testing",
                "author": "K. Claessen, J. Hughes",
                "year": 2000,
                "url": "https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf"
            }
        ]
    },
    {
        "keyword": "API Testing",
        "description": "Тестирование программных интерфейсов приложений (API) для проверки функциональности, надежности, производительности и безопасности. Включает тестирование REST API, GraphQL и других протоколов взаимодействия.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "API Testing: Best Practices",
                "author": "B. Postman",
                "year": 2023,
                "url": "https://www.postman.com/api-platform/api-testing/"
            }
        ]
    },
    {
        "keyword": "REST API",
        "description": "Representational State Transfer - архитектурный стиль для проектирования веб-сервисов. REST API использует HTTP методы (GET, POST, PUT, DELETE) для взаимодействия с ресурсами, представленными в формате JSON или XML.",
        "category": "Технологии",
        "sources": [
            {
                "title": "RESTful Web Services",
                "author": "L. Richardson, S. Ruby",
                "year": 2007,
                "url": "https://www.oreilly.com/library/view/restful-web-services/9780596529260/"
            }
        ]
    },
    {
        "keyword": "GraphQL",
        "description": "Язык запросов и среда выполнения для API, разработанная Facebook. Позволяет клиентам запрашивать именно те данные, которые им нужны, в едином запросе. Предоставляет строгую типизацию и интроспекцию схемы.",
        "category": "Технологии",
        "sources": [
            {
                "title": "GraphQL: The Complete Guide",
                "author": "GraphQL Foundation",
                "year": 2024,
                "url": "https://graphql.org/learn/"
            }
        ]
    },
    {
        "keyword": "Mock",
        "description": "Объект-заглушка, имитирующий поведение реального объекта в тестах. Используется для изоляции тестируемого компонента от зависимостей, позволяя контролировать поведение зависимостей и проверять взаимодействие с ними.",
        "category": "Техники тестирования",
        "sources": [
            {
                "title": "Mocks Aren't Stubs",
                "author": "M. Fowler",
                "year": 2007,
                "url": "https://martinfowler.com/articles/mocksArentStubs.html"
            }
        ]
    },
    {
        "keyword": "Test Fixture",
        "description": "Набор предопределенных данных и состояний, используемых для инициализации тестовой среды. Обеспечивает воспроизводимость тестов и изоляцию тестовых сценариев друг от друга.",
        "category": "Техники тестирования",
        "sources": [
            {
                "title": "xUnit Test Patterns",
                "author": "G. Meszaros",
                "year": 2007,
                "url": "https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Code/dp/0131495054"
            }
        ]
    },
    {
        "keyword": "Test Runner",
        "description": "Инструмент, который выполняет тесты и собирает результаты. Управляет жизненным циклом тестов, обеспечивает параллельное выполнение, генерацию отчетов и интеграцию с системами непрерывной интеграции.",
        "category": "Инструменты",
        "sources": [
            {
                "title": "Jest Documentation",
                "author": "Meta",
                "year": 2024,
                "url": "https://jestjs.io/docs/getting-started"
            }
        ]
    },
    {
        "keyword": "Continuous Integration",
        "description": "Практика разработки, при которой изменения кода автоматически собираются и тестируются. CI обеспечивает раннее обнаружение ошибок, автоматическое выполнение тестов и быструю обратную связь разработчикам.",
        "category": "DevOps",
        "sources": [
            {
                "title": "Continuous Integration",
                "author": "M. Fowler",
                "year": 2006,
                "url": "https://martinfowler.com/articles/continuousIntegration.html"
            }
        ]
    },
    {
        "keyword": "Continuous Deployment",
        "description": "Расширение CI, при котором успешно протестированные изменения автоматически развертываются в production-среду. Требует высокого уровня автоматизации тестирования и надежности процессов.",
        "category": "DevOps",
        "sources": [
            {
                "title": "Continuous Delivery",
                "author": "J. Humble, D. Farley",
                "year": 2010,
                "url": "https://www.oreilly.com/library/view/continuous-delivery/9780321670250/"
            }
        ]
    },
    {
        "keyword": "Regression Testing",
        "description": "Повторное выполнение тестов для проверки того, что ранее работавший функционал не был нарушен новыми изменениями. Критически важно для поддержания качества при постоянной разработке.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "Software Testing Techniques",
                "author": "B. Beizer",
                "year": 1990,
                "url": "https://www.amazon.com/Software-Testing-Techniques-Boris-Beizer/dp/0442206720"
            }
        ]
    },
    {
        "keyword": "Performance Testing",
        "description": "Тестирование производительности системы под различными нагрузками для оценки скорости отклика, пропускной способности, использования ресурсов и стабильности. Включает нагрузочное тестирование, стресс-тестирование и тестирование масштабируемости.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "Performance Testing Guidance",
                "author": "Microsoft",
                "year": 2023,
                "url": "https://learn.microsoft.com/en-us/azure/devops/test/load-test/get-started-simple-cloud-load-test"
            }
        ]
    },
    {
        "keyword": "Load Testing",
        "description": "Тип тестирования производительности, при котором система подвергается ожидаемой рабочей нагрузке для оценки поведения под нормальными условиями использования. Помогает выявить узкие места и проблемы производительности.",
        "category": "Типы тестирования",
        "sources": [
            {
                "title": "The Art of Application Performance Testing",
                "author": "I. Molyneaux",
                "year": 2014,
                "url": "https://www.oreilly.com/library/view/the-art-of/9781491900533/"
            }
        ]
    },
    {
        "keyword": "Static Analysis",
        "description": "Анализ кода без его выполнения для выявления потенциальных ошибок, уязвимостей и проблем качества. Используется для автоматической проверки соответствия стандартам кодирования и обнаружения дефектов на ранних этапах.",
        "category": "Метрики и анализ",
        "sources": [
            {
                "title": "Static Program Analysis",
                "author": "A. Moller, M. Schwartzbach",
                "year": 2020,
                "url": "https://cs.au.dk/~amoeller/spa/"
            }
        ]
    },
    {
        "keyword": "Dynamic Analysis",
        "description": "Анализ поведения программы во время выполнения. Включает профилирование, отслеживание выполнения, анализ памяти и производительности. Используется для обнаружения ошибок времени выполнения и оптимизации.",
        "category": "Метрики и анализ",
        "sources": [
            {
                "title": "Dynamic Program Analysis",
                "author": "J. Larus, T. Ball",
                "year": 2004,
                "url": "https://research.microsoft.com/en-us/um/people/larus/papers/dpa.pdf"
            }
        ]
    },
    {
        "keyword": "Code Coverage",
        "description": "Метрика, измеряющая процент кода, выполненного во время тестирования. Включает покрытие строк, ветвей, функций и условий. Используется для оценки полноты тестового набора.",
        "category": "Метрики и анализ",
        "sources": [
            {
                "title": "Code Coverage Analysis",
                "author": "G. Meszaros",
                "year": 2007,
                "url": "https://www.amazon.com/xUnit-Test-Patterns-Refactoring-Code/dp/0131495054"
            }
        ]
    },
    {
        "keyword": "Test Driven Development",
        "description": "Методология разработки, при которой тесты пишутся до реализации функциональности. Следует циклу Red-Green-Refactor: написать падающий тест, написать минимальный код для прохождения теста, рефакторинг.",
        "category": "Методологии",
        "sources": [
            {
                "title": "Test Driven Development: By Example",
                "author": "K. Beck",
                "year": 2002,
                "url": "https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530"
            }
        ]
    },
    {
        "keyword": "Behavior Driven Development",
        "description": "Методология разработки, расширяющая TDD, фокусируясь на поведении системы с точки зрения пользователя. Тесты формулируются на естественном языке в формате Given-When-Then, что улучшает коммуникацию между заинтересованными сторонами.",
        "category": "Методологии",
        "sources": [
            {
                "title": "BDD in Action",
                "author": "J. Smart",
                "year": 2014,
                "url": "https://www.manning.com/books/bdd-in-action"
            }
        ]
    },
    {
        "keyword": "Page Object Model",
        "description": "Паттерн проектирования для автоматизации тестирования веб-приложений, при котором каждый веб-страница представлена классом, инкапсулирующим элементы страницы и методы взаимодействия с ними. Улучшает поддерживаемость тестов.",
        "category": "Паттерны проектирования",
        "sources": [
            {
                "title": "Page Object Model Pattern",
                "author": "Selenium Project",
                "year": 2024,
                "url": "https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/"
            }
        ]
    },
    {
        "keyword": "Test Data Management",
        "description": "Процесс управления тестовыми данными на протяжении жизненного цикла тестирования. Включает создание, хранение, обновление и очистку тестовых данных. Критически важно для обеспечения воспроизводимости и изоляции тестов.",
        "category": "Управление тестированием",
        "sources": [
            {
                "title": "Test Data Management",
                "author": "E. van der Veen",
                "year": 2019,
                "url": "https://www.thoughtworks.com/insights/blog/test-data-management"
            }
        ]
    },
]

# Определение связей между терминами
RELATIONS = [
    # Основные связи
    ("Автогенерация тестов", "Test Automation", "parent", "Автогенерация тестов является частью автоматизации тестирования"),
    ("Автогенерация тестов", "Unit-тесты", "related", "Автогенерация может создавать unit-тесты"),
    ("Автогенерация тестов", "Интеграционные тесты", "related", "Автогенерация может создавать интеграционные тесты"),
    ("Автогенерация тестов", "E2E тесты", "related", "Автогенерация может создавать E2E тесты"),
    ("Автогенерация тестов", "Веб-платформа", "related", "Автогенерация тестов применяется для веб-платформ"),
    
    # Типы тестирования
    ("Unit-тесты", "Интеграционные тесты", "related", "Оба типа тестов используются в процессе разработки"),
    ("Интеграционные тесты", "E2E тесты", "related", "Оба типа тестов проверяют взаимодействие компонентов"),
    ("E2E тесты", "Selenium", "related", "Selenium используется для E2E тестирования"),
    ("E2E тесты", "Playwright", "related", "Playwright используется для E2E тестирования"),
    ("E2E тесты", "Cypress", "related", "Cypress используется для E2E тестирования"),
    
    # Инструменты
    ("Selenium", "Playwright", "related", "Оба инструмента для автоматизации браузеров"),
    ("Playwright", "Cypress", "related", "Оба инструмента для E2E тестирования"),
    ("Selenium", "Page Object Model", "related", "Selenium часто использует паттерн Page Object Model"),
    ("Playwright", "Page Object Model", "related", "Playwright поддерживает паттерн Page Object Model"),
    
    # Метрики
    ("Test Coverage", "Code Coverage", "synonym", "Test Coverage часто измеряется через Code Coverage"),
    ("Test Coverage", "Mutation Testing", "related", "Mutation Testing оценивает качество тестового покрытия"),
    ("Code Coverage", "Static Analysis", "related", "Code Coverage может быть частью статического анализа"),
    ("Static Analysis", "Dynamic Analysis", "antonym", "Статический и динамический анализ - противоположные подходы"),
    
    # Методы тестирования
    ("Property-based Testing", "Test Automation", "related", "Property-based Testing является формой автоматизации"),
    ("Property-based Testing", "Автогенерация тестов", "related", "Property-based Testing включает автогенерацию данных"),
    
    # API тестирование
    ("API Testing", "REST API", "related", "API Testing часто применяется к REST API"),
    ("API Testing", "GraphQL", "related", "API Testing применяется к GraphQL API"),
    ("REST API", "GraphQL", "related", "Оба являются подходами к проектированию API"),
    
    # Техники
    ("Mock", "Test Fixture", "related", "Mock и Test Fixture используются для подготовки тестовой среды"),
    ("Mock", "Unit-тесты", "related", "Mock часто используется в unit-тестах"),
    ("Test Fixture", "Test Data Management", "related", "Test Fixture является частью управления тестовыми данными"),
    
    # DevOps
    ("Continuous Integration", "Continuous Deployment", "parent", "Continuous Deployment расширяет Continuous Integration"),
    ("Continuous Integration", "Test Automation", "related", "CI требует автоматизации тестов"),
    ("Continuous Deployment", "Regression Testing", "related", "CD требует надежного регрессионного тестирования"),
    
    # Типы тестирования
    ("Regression Testing", "Test Automation", "related", "Регрессионное тестирование автоматизируется"),
    ("Performance Testing", "Load Testing", "parent", "Load Testing является частью Performance Testing"),
    ("Performance Testing", "Test Automation", "related", "Performance Testing может быть автоматизировано"),
    
    # Методологии
    ("Test Driven Development", "Behavior Driven Development", "parent", "BDD расширяет TDD"),
    ("Test Driven Development", "Unit-тесты", "related", "TDD начинается с unit-тестов"),
    ("Behavior Driven Development", "E2E тесты", "related", "BDD часто использует E2E тесты"),
    
    # Инструменты и процессы
    ("Test Runner", "Test Automation", "related", "Test Runner необходим для автоматизации"),
    ("Test Runner", "Continuous Integration", "related", "Test Runner используется в CI"),
    ("Test Data Management", "Test Automation", "related", "Управление данными важно для автоматизации"),
]


def load_terms():
    """Загружает термины в базу данных"""
    init_db()
    
    with Session(engine) as session:
        created_terms = {}
        
        # Создаем термины
        for term_data in TERMS:
            keyword = term_data["keyword"]
            
            # Проверяем, существует ли термин
            existing = session.exec(select(Term).where(Term.keyword == keyword)).first()
            if existing:
                print(f"Термин '{keyword}' уже существует, пропускаем")
                created_terms[keyword] = existing
                continue
            
            # Создаем термин
            term = Term(
                keyword=keyword,
                description=term_data["description"],
                category=term_data["category"]
            )
            session.add(term)
            session.commit()
            session.refresh(term)
            created_terms[keyword] = term
            print(f"Создан термин: {keyword}")
            
            # Добавляем источники
            for source_data in term_data.get("sources", []):
                source = Source(
                    term_id=term.id,
                    title=source_data["title"],
                    url=source_data.get("url"),
                    author=source_data.get("author"),
                    year=source_data.get("year")
                )
                session.add(source)
            session.commit()
        
        # Создаем связи
        for from_keyword, to_keyword, rel_type, description in RELATIONS:
            if from_keyword not in created_terms or to_keyword not in created_terms:
                print(f"Пропускаем связь {from_keyword} -> {to_keyword}: один из терминов не найден")
                continue
            
            term_from = created_terms[from_keyword]
            term_to = created_terms[to_keyword]
            
            # Проверяем, существует ли связь
            existing = session.exec(
                select(TermRelation).where(
                    TermRelation.term_from_id == term_from.id,
                    TermRelation.term_to_id == term_to.id,
                    TermRelation.relation_type == RelationType(rel_type)
                )
            ).first()
            
            if existing:
                print(f"Связь {from_keyword} -> {to_keyword} уже существует, пропускаем")
                continue
            
            relation = TermRelation(
                term_from_id=term_from.id,
                term_to_id=term_to.id,
                relation_type=RelationType(rel_type),
                description=description
            )
            session.add(relation)
            print(f"Создана связь: {from_keyword} ({rel_type}) -> {to_keyword}")
        
        session.commit()
        print(f"\nЗагружено терминов: {len(created_terms)}")
        print(f"Загружено связей: {len(RELATIONS)}")


if __name__ == "__main__":
    print("Загрузка терминов по теме 'Автогенерация тестов для веб платформы'...")
    load_terms()
    print("Загрузка завершена!")
