"""
Скрипт для генерации графиков из результатов нагрузочного тестирования Locust
"""
import csv
import os
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Используем backend без GUI
import pandas as pd

# Настройка стиля графиков
plt.style.use('seaborn-v0_8-darkgrid')
matplotlib.rcParams['figure.figsize'] = (12, 6)
matplotlib.rcParams['font.size'] = 10

REPORTS_DIR = Path(__file__).parent.parent / "reports"
CHARTS_DIR = Path(__file__).parent.parent / "charts"
CHARTS_DIR.mkdir(exist_ok=True)


def load_stats_csv(csv_path):
    """Загружает статистику из CSV файла Locust"""
    if not csv_path.exists():
        return None
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        data = list(reader)
    
    # Находим строку Aggregated
    for row in data:
        if row['Name'] == 'Aggregated' or row['Name'] == '':
            return row
    return None


def parse_percentile(value):
    """Парсит значение перцентиля из CSV"""
    try:
        return float(value) if value else 0.0
    except (ValueError, TypeError):
        return 0.0


def create_latency_comparison_chart():
    """Создает график сравнения латентности REST vs gRPC по сценариям"""
    scenarios = ['light', 'normal', 'stress']
    metrics = {
        'Average': 'Average Response Time',
        'p95': '95%',
        'p99': '99%'
    }
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle('Сравнение латентности REST vs gRPC', fontsize=16, fontweight='bold')
    
    for idx, (metric_key, metric_name) in enumerate(metrics.items()):
        ax = axes[idx]
        rest_values = []
        grpc_values = []
        
        for scenario in scenarios:
            rest_file = REPORTS_DIR / f"rest_{scenario}_stats.csv"
            grpc_file = REPORTS_DIR / f"grpc_{scenario}_stats.csv"
            
            rest_data = load_stats_csv(rest_file)
            grpc_data = load_stats_csv(grpc_file)
            
            if metric_key == 'Average':
                rest_val = parse_percentile(rest_data.get('Average Response Time', 0)) if rest_data else 0
                grpc_val = parse_percentile(grpc_data.get('Average Response Time', 0)) if grpc_data else 0
            else:
                rest_val = parse_percentile(rest_data.get(metric_name, 0)) if rest_data else 0
                grpc_val = parse_percentile(grpc_data.get(metric_name, 0)) if grpc_data else 0
            
            rest_values.append(rest_val)
            grpc_values.append(grpc_val)
        
        x = range(len(scenarios))
        width = 0.35
        
        bars1 = ax.bar([i - width/2 for i in x], rest_values, width, label='REST', color='#3498db', alpha=0.8)
        bars2 = ax.bar([i + width/2 for i in x], grpc_values, width, label='gRPC', color='#e74c3c', alpha=0.8)
        
        ax.set_xlabel('Сценарий', fontweight='bold')
        ax.set_ylabel('Время ответа (ms)', fontweight='bold')
        ax.set_title(f'{metric_key} Response Time', fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(['Light', 'Normal', 'Stress'])
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Добавляем значения на столбцы
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.1f}',
                       ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'latency_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Создан график: latency_comparison.png")


def create_rps_comparison_chart():
    """Создает график сравнения RPS REST vs gRPC"""
    scenarios = ['light', 'normal', 'stress']
    rest_rps = []
    grpc_rps = []
    
    for scenario in scenarios:
        rest_file = REPORTS_DIR / f"rest_{scenario}_stats.csv"
        grpc_file = REPORTS_DIR / f"grpc_{scenario}_stats.csv"
        
        rest_data = load_stats_csv(rest_file)
        grpc_data = load_stats_csv(grpc_file)
        
        rest_val = parse_percentile(rest_data.get('Requests/s', 0)) if rest_data else 0
        grpc_val = parse_percentile(grpc_data.get('Requests/s', 0)) if grpc_data else 0
        
        rest_rps.append(rest_val)
        grpc_rps.append(grpc_val)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x = range(len(scenarios))
    width = 0.35
    
    bars1 = ax.bar([i - width/2 for i in x], rest_rps, width, label='REST', color='#3498db', alpha=0.8)
    bars2 = ax.bar([i + width/2 for i in x], grpc_rps, width, label='gRPC', color='#e74c3c', alpha=0.8)
    
    ax.set_xlabel('Сценарий', fontweight='bold', fontsize=12)
    ax.set_ylabel('Запросов в секунду (RPS)', fontweight='bold', fontsize=12)
    ax.set_title('Сравнение пропускной способности (RPS)', fontweight='bold', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(['Light\n(10 users)', 'Normal\n(50 users)', 'Stress\n(100 users)'])
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3, axis='y')
    
    # Добавляем значения на столбцы
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.1f}',
                   ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'rps_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Создан график: rps_comparison.png")


def create_percentile_comparison_chart():
    """Создает график сравнения перцентилей для stress теста"""
    scenario = 'stress'
    percentiles = ['50%', '75%', '90%', '95%', '98%', '99%', '99.9%']
    
    rest_file = REPORTS_DIR / f"rest_{scenario}_stats.csv"
    grpc_file = REPORTS_DIR / f"grpc_{scenario}_stats.csv"
    
    rest_data = load_stats_csv(rest_file)
    grpc_data = load_stats_csv(grpc_file)
    
    if not rest_data or not grpc_data:
        print("⚠ Данные для stress теста не найдены")
        return
    
    rest_values = [parse_percentile(rest_data.get(p, 0)) for p in percentiles]
    grpc_values = [parse_percentile(grpc_data.get(p, 0)) for p in percentiles]
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    x = range(len(percentiles))
    width = 0.35
    
    bars1 = ax.bar([i - width/2 for i in x], rest_values, width, label='REST', color='#3498db', alpha=0.8)
    bars2 = ax.bar([i + width/2 for i in x], grpc_values, width, label='gRPC', color='#e74c3c', alpha=0.8)
    
    ax.set_xlabel('Перцентиль', fontweight='bold', fontsize=12)
    ax.set_ylabel('Время ответа (ms)', fontweight='bold', fontsize=12)
    ax.set_title('Распределение латентности (Stress Test, 100 users)', fontweight='bold', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(percentiles)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3, axis='y')
    
    # Добавляем значения на столбцы
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.0f}',
                       ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'percentile_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Создан график: percentile_comparison.png")


def create_error_rate_chart():
    """Создает график сравнения процента ошибок"""
    scenarios = ['light', 'normal', 'stress']
    rest_errors = []
    grpc_errors = []
    
    for scenario in scenarios:
        rest_file = REPORTS_DIR / f"rest_{scenario}_stats.csv"
        grpc_file = REPORTS_DIR / f"grpc_{scenario}_stats.csv"
        
        rest_data = load_stats_csv(rest_file)
        grpc_data = load_stats_csv(grpc_file)
        
        if rest_data:
            total = int(rest_data.get('Request Count', 0) or 0)
            failed = int(rest_data.get('Failure Count', 0) or 0)
            rest_error_rate = (failed / total * 100) if total > 0 else 0
        else:
            rest_error_rate = 0
        
        if grpc_data:
            total = int(grpc_data.get('Request Count', 0) or 0)
            failed = int(grpc_data.get('Failure Count', 0) or 0)
            grpc_error_rate = (failed / total * 100) if total > 0 else 0
        else:
            grpc_error_rate = 0
        
        rest_errors.append(rest_error_rate)
        grpc_errors.append(grpc_error_rate)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x = range(len(scenarios))
    width = 0.35
    
    bars1 = ax.bar([i - width/2 for i in x], rest_errors, width, label='REST', color='#e74c3c', alpha=0.8)
    bars2 = ax.bar([i + width/2 for i in x], grpc_errors, width, label='gRPC', color='#27ae60', alpha=0.8)
    
    ax.set_xlabel('Сценарий', fontweight='bold', fontsize=12)
    ax.set_ylabel('Процент ошибок (%)', fontweight='bold', fontsize=12)
    ax.set_title('Сравнение процента ошибок', fontweight='bold', fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(['Light', 'Normal', 'Stress'])
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3, axis='y')
    
    # Добавляем значения на столбцы
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.1f}%',
                       ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(CHARTS_DIR / 'error_rate_comparison.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"✓ Создан график: error_rate_comparison.png")


def create_response_time_timeline():
    """Создает график изменения времени ответа во времени (из stats_history)"""
    scenario = 'stress'
    
    rest_file = REPORTS_DIR / f"rest_{scenario}_stats_history.csv"
    grpc_file = REPORTS_DIR / f"grpc_{scenario}_stats_history.csv"
    
    if not rest_file.exists() or not grpc_file.exists():
        print("⚠ Файлы истории не найдены")
        return
    
    try:
        rest_df = pd.read_csv(rest_file)
        grpc_df = pd.read_csv(grpc_file)
        
        # Фильтруем только Aggregated данные
        rest_agg = rest_df[rest_df['Name'] == 'Aggregated'].copy()
        grpc_agg = grpc_df[grpc_df['Name'] == 'Aggregated'].copy()
        
        if rest_agg.empty or grpc_agg.empty:
            print("⚠ Нет агрегированных данных в истории")
            return
        
        fig, ax = plt.subplots(figsize=(14, 7))
        
        # Конвертируем время в минуты от начала
        if 'Timestamp' in rest_agg.columns:
            rest_agg['Time'] = pd.to_datetime(rest_agg['Timestamp'], unit='s', errors='coerce')
            rest_agg['Minutes'] = (rest_agg['Time'] - rest_agg['Time'].min()).dt.total_seconds() / 60
        else:
            rest_agg['Minutes'] = range(len(rest_agg))
        
        if 'Timestamp' in grpc_agg.columns:
            grpc_agg['Time'] = pd.to_datetime(grpc_agg['Timestamp'], unit='s', errors='coerce')
            grpc_agg['Minutes'] = (grpc_agg['Time'] - grpc_agg['Time'].min()).dt.total_seconds() / 60
        else:
            grpc_agg['Minutes'] = range(len(grpc_agg))
        
        # Используем правильное имя колонки
        rest_col = 'Total Average Response Time' if 'Total Average Response Time' in rest_agg.columns else 'Average Response Time'
        grpc_col = 'Total Average Response Time' if 'Total Average Response Time' in grpc_agg.columns else 'Average Response Time'
        
        if rest_col not in rest_agg.columns or grpc_col not in grpc_agg.columns:
            print("⚠ Колонка Average Response Time не найдена")
            return
        
        ax.plot(rest_agg['Minutes'], rest_agg[rest_col], 
               label='REST (Average)', color='#3498db', linewidth=2, alpha=0.8)
        ax.plot(grpc_agg['Minutes'], grpc_agg[grpc_col], 
               label='gRPC (Average)', color='#e74c3c', linewidth=2, alpha=0.8)
        
        ax.set_xlabel('Время (минуты)', fontweight='bold', fontsize=12)
        ax.set_ylabel('Время ответа (ms)', fontweight='bold', fontsize=12)
        ax.set_title('Изменение времени ответа во времени (Stress Test)', fontweight='bold', fontsize=14)
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(CHARTS_DIR / 'response_time_timeline.png', dpi=300, bbox_inches='tight')
        plt.close()
        print(f"✓ Создан график: response_time_timeline.png")
    except Exception as e:
        print(f"⚠ Ошибка при создании timeline графика: {e}")


def main():
    """Главная функция для генерации всех графиков"""
    print("Генерация графиков из результатов тестирования...")
    print(f"Директория отчетов: {REPORTS_DIR}")
    print(f"Директория графиков: {CHARTS_DIR}\n")
    
    create_latency_comparison_chart()
    create_rps_comparison_chart()
    create_percentile_comparison_chart()
    create_error_rate_chart()
    create_response_time_timeline()
    
    print(f"\n✓ Все графики созданы в директории: {CHARTS_DIR}")


if __name__ == "__main__":
    main()

