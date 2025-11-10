import time
import os
import heapq  # NUEVO IMPORT
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def is_blocked(self, key: str) -> bool:
        with self.lock:
            now = time.time()
            
            # NUEVO: Usar heapq para mantener las solicitudes ordenadas
            if key in self.requests:
                # Limpiar solicitudes antiguas usando búsqueda binaria
                requests = self.requests[key]
                
                # Encontrar el índice donde las solicitudes son recientes
                cutoff_time = now - self.window_seconds
                
                # Usar heapq para mantener el heap y eliminar elementos antiguos eficientemente
                while requests and requests[0] < cutoff_time:
                    heapq.heappop(requests)
                
                self.requests[key] = requests
                
                return len(requests) >= self.max_requests
            return False

    def get_remaining_requests(self, key: str) -> int:
        with self.lock:
            now = time.time()
            if key in self.requests:
                requests = self.requests[key]
                cutoff_time = now - self.window_seconds
                
                # Filtrar solicitudes recientes usando heapq
                recent_requests = [req for req in requests if req >= cutoff_time]
                heapq.heapify(recent_requests)
                self.requests[key] = recent_requests
                
                return max(0, self.max_requests - len(recent_requests))
            return self.max_requests

    def record_request(self, key: str):
        with self.lock:
            now = time.time()
            if key not in self.requests:
                self.requests[key] = []
            
            # Usar heapq para insertar eficientemente
            heapq.heappush(self.requests[key], now)
            
            # Limpiar solicitudes antiguas
            cutoff_time = now - self.window_seconds
            requests = self.requests[key]
            
            while requests and requests[0] < cutoff_time:
                heapq.heappop(requests)

    def get_block_time_remaining(self, key: str) -> float:
        with self.lock:
            if key not in self.requests or not self.requests[key]:
                return 0
                
            now = time.time()
            # El elemento más antiguo está en la raíz del heap
            oldest_request = self.requests[key][0]
            return max(0, self.window_seconds - (now - oldest_request))

    def clear_requests(self, key: str):
        with self.lock:
            if key in self.requests:
                del self.requests[key]

# Rate limiter para login (5 req/min por IP)
login_max_requests = int(os.getenv("RATE_LIMIT_AUTH_PER_MIN", 5))
login_rate_limiter = RateLimiter(max_requests=login_max_requests, window_seconds=60)

# Rate limiter para API autenticada (60 req/min por token/IP)
api_max_requests = int(os.getenv("RATE_LIMIT_API_PER_MIN", 60))
api_rate_limiter = RateLimiter(max_requests=api_max_requests, window_seconds=60)