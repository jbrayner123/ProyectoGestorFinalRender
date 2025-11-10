import heapq
from datetime import datetime
from typing import List, Tuple, Optional

class TaskPriorityQueue:
    """
    Cola de prioridad para tareas.
    Ordena por: 
    1. Prioridad (urgent > high > medium > low)
    2. Fecha de vencimiento (más cercana primero)
    3. Importancia (importantes primero)
    """
    
    def __init__(self):
        self.heap = []
        self.priority_map = {
            'urgent': 0,
            'high': 1, 
            'medium': 2,
            'low': 3
        }
    
    def _get_priority_score(self, task) -> Tuple[int, float, int, int]:
        """Calcula el score de prioridad"""
        priority_score = self.priority_map.get(task.priority, 2)
        
        # Fecha de vencimiento: más cercana = mayor prioridad
        due_date_score = float('inf')
        if task.due_date:
            due_timestamp = datetime.combine(
                task.due_date, 
                task.due_time or datetime.min.time()
            ).timestamp()
            due_date_score = due_timestamp
        
        # Importancia: importantes primero
        importance_score = 0 if task.important else 1
        
        # Tareas no completadas primero
        completion_score = 1 if task.is_completed else 0
        
        return (priority_score, due_date_score, importance_score, completion_score, task.id)
    
    def push(self, task):
        """Agrega una tarea a la cola de prioridad"""
        priority_score = self._get_priority_score(task)
        heapq.heappush(self.heap, (priority_score, task))
    
    def pop(self):
        """Extrae la tarea con mayor prioridad"""
        if self.heap:
            priority_score, task = heapq.heappop(self.heap)
            return task
        return None
    
    def push_all(self, tasks: List):
        """Agrega múltiples tareas a la cola"""
        for task in tasks:
            self.push(task)
    
    def get_priority_list(self, limit: Optional[int] = None) -> List:
        """Obtiene lista de tareas ordenadas por prioridad (de mayor a menor)"""
        sorted_tasks = []
        temp_heap = self.heap.copy()
        
        while temp_heap and (limit is None or len(sorted_tasks) < limit):
            priority_score, task = heapq.heappop(temp_heap)
            sorted_tasks.append(task)
        
        return sorted_tasks
    
    def __len__(self):
        return len(self.heap)
    
    def clear(self):
        """Limpia la cola de prioridad"""
        self.heap = []